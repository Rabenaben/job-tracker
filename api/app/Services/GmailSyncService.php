<?php

namespace App\Services;

use App\Models\JobApplication;
use App\Models\User;
use Illuminate\Support\Facades\Http;

class GmailSyncService
{
    private User $user;
    private array $importedMessageIds = [];
    private array $syncSummary = [
        'new' => 0,
        'duplicates' => 0,
        'errors' => 0,
        'processed' => 0,
    ];

    // Default sender domains for job-related emails
    private array $senderDomains = [
        'linkedin.com' => 'linkedin',
        'linkedinmail.com' => 'linkedin',
        'indeed.com' => 'indeed',
        'greenhouse.io' => 'greenhouse',
        'greenhouses.io' => 'greenhouse',
        'lever.co' => 'lever',
        'leverus.com' => 'lever',
        'workday.com' => 'workday',
        'bamboohr.com' => 'bamboohr',
        'taleo.net' => 'taleo',
        'smartrecruiters.com' => 'smartrecruiters',
        'ashbyhq.com' => 'ashby',
        'ashby.io' => 'ashby',
        'hiringthing.com' => 'hiringthing',
        'jobvite.com' => 'jobvite',
        'jazzhr.com' => 'jazzhr',
    ];

    // Default subject keywords for job-related emails
    private array $subjectKeywords = [
        'application',
        'applied',
        'candidacy',
        'candidature',
        'interview',
        'position',
        'opportunity',
        'hiring',
        'status',
        'thank you for',
        'progressed',
    ];

    public function __construct(User $user)
    {
        $this->user = $user;
        $this->loadImportedMessageIds();
    }

    /**
     * Sync emails from Gmail and create job applications.
     */
    public function sync(): array
    {
        if (!$this->user->google_refresh_token) {
            throw new \RuntimeException('Gmail account not connected');
        }

        try {
            $accessToken = $this->getAccessToken();
            $query = $this->buildSearchQuery();
            $messages = $this->fetchEmails($accessToken, $query);

            foreach ($messages as $message) {
                $this->syncSummary['processed']++;
                $this->processEmail($message);
            }

            $this->user->update(['gmail_synced_at' => now()]);

            return $this->syncSummary;
        } catch (\Exception $e) {
            $this->syncSummary['errors']++;
            throw $e;
        }
    }

    /**
     * Build Gmail search query for job-related emails.
     */
    protected function buildSearchQuery(): string
    {
        $domainConditions = array_map(fn($domain) => "from:{$domain}", array_keys($this->senderDomains));
        $keywordConditions = array_map(fn($keyword) => "subject:{$keyword}", $this->subjectKeywords);

        $domainPart = '(' . implode(' OR ', $domainConditions) . ')';
        $keywordPart = '(' . implode(' OR ', $keywordConditions) . ')';

        return "{$domainPart} AND {$keywordPart}";
    }

    /**
     * Get fresh access token from refresh token.
     */
    protected function getAccessToken(): string
    {
        $refreshToken = decrypt($this->user->google_refresh_token);

        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'client_id' => config('google.client_id'),
            'client_secret' => config('google.client_secret'),
            'grant_type' => 'refresh_token',
            'refresh_token' => $refreshToken,
        ]);

        if (!$response->successful()) {
            throw new \RuntimeException('Failed to refresh access token');
        }

        return $response->json()['access_token'];
    }

    /**
     * Fetch emails from Gmail API matching the query.
     */
    protected function fetchEmails(string $accessToken, string $query): array
    {
        $response = Http::withToken($accessToken)
            ->get('https://gmail.googleapis.com/gmail/v1/users/me/messages', [
                'q' => $query,
                'maxResults' => 50,
            ]);

        if (!$response->successful()) {
            throw new \RuntimeException('Failed to fetch emails from Gmail');
        }

        $messages = $response->json()['messages'] ?? [];

        $fullMessages = [];
        foreach ($messages as $message) {
            $fullResponse = Http::withToken($accessToken)
                ->get("https://gmail.googleapis.com/gmail/v1/users/me/messages/{$message['id']}");
            if ($fullResponse->successful()) {
                $fullMessages[] = $fullResponse->json();
            }
        }

        return $fullMessages;
    }

    /**
     * Process a single email and create job application if new.
     */
    protected function processEmail(array $message): void
    {
        try {
            $messageId = $message['id'];
            $threadId = $message['threadId'] ?? null;
            $payload = $message['payload'] ?? [];
            $headers = $this->extractHeaders($payload['headers'] ?? []);

            // Check for duplicate by message ID
            if (in_array($messageId, $this->importedMessageIds)) {
                $this->syncSummary['duplicates']++;
                return;
            }

            // Get email body snippet
            $snippet = $this->extractSnippet($message);
            $from = $headers['from'] ?? '';

            // Extract data
            $source = $this->extractSource($from);
            $company = $this->extractCompany($headers, $snippet);
            $role = $this->cleanRole($this->extractRole($headers['subject'] ?? '', $snippet));

            // Create job application
            $emailData = [
                'company' => $company,
                'role' => $role,
                'applied_at' => $this->extractDate($message),
                'notes' => $this->generateRichNotes($headers, $snippet, $messageId, $source),
                'gmail_message_id' => $messageId,
                'gmail_thread_id' => $threadId,
                'source' => $source,
            ];

            $this->createJobApplication($emailData);
            $this->syncSummary['new']++;
            $this->importedMessageIds[] = $messageId;

        } catch (\Exception $e) {
            $this->syncSummary['errors']++;
        }
    }

    /**
     * Extract job board source from sender email.
     */
    protected function extractSource(string $from): string
    {
        foreach ($this->senderDomains as $domain => $source) {
            if (stripos($from, $domain) !== false) {
                return $source;
            }
        }
        return 'other';
    }

    /**
     * Extract company name from email headers or body.
     */
    protected function extractCompany(array $headers, string $snippet = ''): string
    {
        $from = $headers['from'] ?? '';

        // Try LinkedIn format: "Company Name via LinkedIn" or "LinkedIn Jobs"
        if (stripos($from, 'linkedin.com') !== false || stripos($from, 'linkedinmail.com') !== false) {
            // LinkedIn: "Acme Corp via LinkedIn" or "Acme Corp | LinkedIn"
            if (preg_match('/^"?([^"]+?)(?:\s+(?:via|\|)\s+LinkedIn)?"?\s*</', $from, $matches)) {
                return trim($matches[1]);
            }
        }

        // Try display name in quotes
        if (preg_match('/^"([^"]+)"/', $from, $matches)) {
            $displayName = $matches[1];
            // Clean up LinkedIn suffixes
            $displayName = preg_replace('/\s+(?:via\s+LinkedIn|LinkedIn Jobs)$/i', '', $displayName);
            if (!empty($displayName) && strlen($displayName) > 1) {
                return $displayName;
            }
        }

        // Try email domain (without TLD)
        if (preg_match('/@([^>]+)/', $from, $matches)) {
            $domain = $matches[1];
            // Map common domains to clean names
            $cleanDomains = [
                'linkedin' => 'LinkedIn',
                'indeed' => 'Indeed',
                'greenhouse' => 'Greenhouse',
                'lever' => 'Lever',
                'workday' => 'Workday',
                'bamboohr' => 'BambooHR',
                'ashby' => 'Ashby',
            ];
            foreach ($cleanDomains as $key => $name) {
                if (stripos($domain, $key) !== false) {
                    return $name;
                }
            }
            return ucfirst(explode('.', $domain)[0]);
        }

        // Check snippet for company pattern: "at [Company]"
        if (preg_match('/\bat\s+([A-Z][A-Za-z0-9\s&]+?)(?:\.|,|\s+and|\s+we|\s+Your)/', $snippet, $matches)) {
            return trim($matches[1]);
        }

        return 'Unknown';
    }

    /**
     * Extract job role from subject or body.
     */
    protected function extractRole(string $subject, string $snippet = ''): string
    {
        // Pattern: "Application to [Role] at Company" or "Applied to [Role]"
        // Allow optional "at/for/position" suffix or end of string
        if (preg_match('/(?:application|applied|your candidacy)\s+(?:to\s+)?(.+?)(?:\s+(?:at|for|$)|$)/i', $subject, $matches)) {
            return trim($matches[1]);
        }

        // Pattern: "[Role] position" or "[Role] - Company"
        if (preg_match('/^(.+?)\s+(?:position|job|role|opportunity)/i', $subject, $matches)) {
            return trim($matches[1]);
        }

        // Pattern in snippet: "for the [Role] position"
        if (preg_match('/\bfor\s+(?:the\s+)?(.+?)\s+position/i', $snippet, $matches)) {
            return trim($matches[1]);
        }

        // Pattern: "for [Role] at"
        if (preg_match('/\bfor\s+(.+?)\s+(?:at\s+|$)/i', $snippet, $matches)) {
            return trim($matches[1]);
        }

        // Clean and return subject as last resort (will be cleaned by cleanRole)
        return trim($subject);
    }

    /**
     * Clean up role string - remove suffixes, brackets, extra whitespace.
     */
    protected function cleanRole(string $role): string
    {
        // Remove status indicators
        $role = preg_replace('/^(?:application|applied)\s*:?\s*/i', '', $role);

        // Remove bracketed content like [External], [Internal], [Active]
        $role = preg_replace('/\s*\[[^\]]+\]\s*/', '', $role);

        // Remove parenthetical content like (1), (2), (Senior)
        $role = preg_replace('/\s*\([^)]+\)\s*/', '', $role);

        // Remove common prefixes
        $role = preg_replace('/^(?:job\s*:?\s*|role\s*:?\s*|position\s*:?\s*)/i', '', $role);

        // Clean up whitespace
        $role = preg_replace('/\s+/', ' ', $role);
        $role = trim($role);

        // If too generic after cleaning, return original
        return empty($role) ? 'Unknown Position' : $role;
    }

    /**
     * Extract date from email.
     */
    protected function extractDate(array $message): string
    {
        $internalDate = $message['internalDate'] ?? null;
        if ($internalDate) {
            return date('Y-m-d', (int)($internalDate / 1000));
        }
        return date('Y-m-d');
    }

    /**
     * Extract snippet from email payload.
     */
    protected function extractSnippet(array $message): string
    {
        return $message['snippet'] ?? '';
    }

    /**
     * Extract headers from message payload.
     */
    protected function extractHeaders(array $headers): array
    {
        $result = [];
        foreach ($headers as $header) {
            $result[$header['name']] = $header['value'];
        }
        return $result;
    }

    /**
     * Generate rich notes with source, snippet, and metadata.
     */
    protected function generateRichNotes(array $headers, string $snippet, string $messageId, string $source): string
    {
        // Map source to proper display name
        $sourceMap = [
            'linkedin' => 'LinkedIn',
            'indeed' => 'Indeed',
            'greenhouse' => 'Greenhouse',
            'lever' => 'Lever',
            'workday' => 'Workday',
            'bamboohr' => 'BambooHR',
            'taleo' => 'Taleo',
            'smartrecruiters' => 'SmartRecruiters',
            'ashby' => 'Ashby',
            'other' => 'Other',
        ];
        $sourceDisplay = $sourceMap[$source] ?? ucfirst($source);
        $subject = $headers['subject'] ?? 'No Subject';
        $date = $headers['date'] ?? date('Y-m-d H:i');

        $notes = "Source: {$sourceDisplay}\n";
        $notes .= "Imported: " . date('Y-m-d H:i') . "\n";
        $notes .= "Subject: {$subject}\n";
        $notes .= "Message ID: {$messageId}\n\n";

        if (!empty($snippet)) {
            // Clean snippet - remove HTML entities
            $snippet = html_entity_decode($snippet, ENT_QUOTES, 'UTF-8');
            $notes .= "Preview:\n{$snippet}";
        }

        return $notes;
    }

    /**
     * Create job application from email data.
     */
    protected function createJobApplication(array $emailData): JobApplication
    {
        return JobApplication::create([
            'user_id' => $this->user->id,
            'company' => $emailData['company'],
            'role' => $emailData['role'],
            'status' => 'applied',
            'applied_at' => $emailData['applied_at'],
            'notes' => $emailData['notes'],
            'gmail_message_id' => $emailData['gmail_message_id'],
            'gmail_thread_id' => $emailData['gmail_thread_id'],
            'source' => $emailData['source'],
        ]);
    }

    /**
     * Load existing imported message IDs for deduplication.
     */
    protected function loadImportedMessageIds(): void
    {
        $this->importedMessageIds = JobApplication::where('user_id', $this->user->id)
            ->whereNotNull('gmail_message_id')
            ->pluck('gmail_message_id')
            ->toArray();
    }
}