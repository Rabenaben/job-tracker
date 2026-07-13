<?php

namespace Tests\Unit\Services;

use App\Models\User;
use App\Services\GmailSyncService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use ReflectionMethod;
use Tests\TestCase;

class GmailSyncServiceTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function service_extracts_source_from_sender_domain(): void
    {
        $user = User::factory()->create();
        $service = new GmailSyncService($user);

        $method = new ReflectionMethod(GmailSyncService::class, 'extractSource');
        $method->setAccessible(true);

        // LinkedIn email
        $source = $method->invoke($service, 'jobs-noreply@linkedin.com');
        $this->assertEquals('linkedin', $source);

        // Indeed email
        $source = $method->invoke($service, 'noreply@indeed.com');
        $this->assertEquals('indeed', $source);

        // Greenhouse
        $source = $method->invoke($service, 'em@greenhouses.io');
        $this->assertEquals('greenhouse', $source);

        // Unknown domain
        $source = $method->invoke($service, 'random@unknown.com');
        $this->assertEquals('other', $source);
    }

    #[Test]
    public function service_extracts_company_from_linkedin_format(): void
    {
        $user = User::factory()->create();
        $service = new GmailSyncService($user);

        $method = new ReflectionMethod(GmailSyncService::class, 'extractCompany');
        $method->setAccessible(true);

        // LinkedIn via format
        $headers = ['from' => '"Acme Corp via LinkedIn" <jobs@linkedin.com>'];
        $company = $method->invoke($service, $headers, '');
        $this->assertEquals('Acme Corp', $company);

        // Plain display name
        $headers = ['from' => '"Stripe" <jobs@company.com>'];
        $company = $method->invoke($service, $headers, '');
        $this->assertEquals('Stripe', $company);

        // Email domain
        $headers = ['from' => 'noreply@indeed.com'];
        $company = $method->invoke($service, $headers, '');
        $this->assertEquals('Indeed', $company);
    }

    #[Test]
    public function service_generates_rich_notes(): void
    {
        $user = User::factory()->create();
        $service = new GmailSyncService($user);

        $method = new ReflectionMethod(GmailSyncService::class, 'generateRichNotes');
        $method->setAccessible(true);

        $headers = [
            'subject' => 'Application to Software Engineer at Acme Corp',
            'date' => 'Mon, 01 Jan 2024 12:00:00 +0000',
        ];
        $snippet = 'Thanks for your interest in the Software Engineer position...';
        $messageId = 'msg_123';

        $notes = $method->invoke($service, $headers, $snippet, $messageId, 'linkedin');

        // Should contain source
        $this->assertStringContainsString('Source: LinkedIn', $notes);
        // Should contain snippet
        $this->assertStringContainsString('Thanks for your interest', $notes);
        // Should contain message reference
        $this->assertStringContainsString('msg_123', $notes);
    }

    #[Test]
    public function job_application_stores_gmail_columns(): void
    {
        $user = User::factory()->create();

        $application = \App\Models\JobApplication::create([
            'user_id' => $user->id,
            'company' => 'Acme Corp',
            'role' => 'Software Engineer',
            'status' => 'applied',
            'applied_at' => now(),
            'gmail_message_id' => 'msg_123',
            'gmail_thread_id' => 'thread_456',
            'source' => 'linkedin',
        ]);

        $this->assertEquals('msg_123', $application->gmail_message_id);
        $this->assertEquals('thread_456', $application->gmail_thread_id);
        $this->assertEquals('linkedin', $application->source);
    }

    #[Test]
    public function service_cleans_up_role_extraction(): void
    {
        $user = User::factory()->create();
        $service = new GmailSyncService($user);

        $method = new ReflectionMethod(GmailSyncService::class, 'cleanRole');
        $method->setAccessible(true);

        // Remove brackets like [External]
        $role = $method->invoke($service, 'Software Engineer [External]');
        $this->assertEquals('Software Engineer', $role);

        // Clean up extra whitespace
        $role = $method->invoke($service, '  Senior  Developer  ');
        $this->assertEquals('Senior Developer', $role);

        // Remove status indicators
        $role = $method->invoke($service, 'Application: Backend Engineer');
        $this->assertEquals('Backend Engineer', $role);

        // Remove parenthetical
        $role = $method->invoke($service, 'Senior Developer (1)');
        $this->assertEquals('Senior Developer', $role);

        // Empty role should return default
        $role = $method->invoke($service, '');
        $this->assertEquals('Unknown Position', $role);
    }

    #[Test]
    public function service_extracts_role_from_subject_patterns(): void
    {
        $user = User::factory()->create();
        $service = new GmailSyncService($user);

        $method = new ReflectionMethod(GmailSyncService::class, 'extractRole');
        $method->setAccessible(true);

        // Pattern: "Application to Senior Developer"
        $role = $method->invoke($service, 'Application to Senior Developer at Acme Corp', '');
        $this->assertEquals('Senior Developer', $role);

        // Pattern: "Applied to Backend Engineer"
        $role = $method->invoke($service, 'Applied to Backend Engineer', '');
        $this->assertEquals('Backend Engineer', $role);

        // Pattern: "Software Engineer position"
        $role = $method->invoke($service, 'Software Engineer position at BigCo', '');
        $this->assertEquals('Software Engineer', $role);
    }
}