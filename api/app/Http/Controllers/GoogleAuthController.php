<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Str;

class GoogleAuthController extends Controller
{
    /**
     * Secret key for signing state tokens (HMAC).
     * In production, use a persistent secret from config/env.
     */
    private function getSigningKey(): string
    {
        return config('app.key') . config('google.client_secret', '');
    }

    /**
     * Generate a signed state token containing user_id.
     * Format: base64(user_id|timestamp|signature)
     */
    private function generateSignedState(int $userId): string
    {
        $timestamp = time();
        $payload = "{$userId}|{$timestamp}";
        $signature = hash_hmac('sha256', $payload, $this->getSigningKey());

        return base64_encode("{$payload}|{$signature}");
    }

    /**
     * Verify and decode a signed state token.
     * Returns user_id on success, null on failure.
     */
    private function verifySignedState(string $state): ?int
    {
        $decoded = base64_decode($state, true);
        if (!$decoded) {
            return null;
        }

        $parts = explode('|', $decoded);
        if (count($parts) !== 3) {
            return null;
        }

        [$userId, $timestamp, $signature] = $parts;

        // Verify signature
        $expectedSignature = hash_hmac('sha256', "{$userId}|{$timestamp}", $this->getSigningKey());
        if (!hash_equals($expectedSignature, $signature)) {
            return null;
        }

        // Check timestamp (state valid for 10 minutes)
        if (time() - (int)$timestamp > 600) {
            return null;
        }

        return (int)$userId;
    }

    /**
     * Initiate Google OAuth flow.
     * Returns JSON with the OAuth URL so frontend can redirect the browser.
     */
    public function initiate(Request $request): JsonResponse
    {
        $user = $request->user();
        $signedState = $this->generateSignedState($user->id);

        $params = http_build_query([
            'client_id' => config('google.client_id'),
            'redirect_uri' => config('google.redirect_uri'),
            'response_type' => 'code',
            'scope' => implode(' ', config('google.scopes')),
            'access_type' => config('google.access_type'),
            'approval_prompt' => 'force', // Always show consent
            'state' => $signedState,
        ]);

        $oauthUrl = "https://accounts.google.com/o/oauth2/v2/auth?{$params}";

        return response()->json([
            'oauth_url' => $oauthUrl,
        ]);
    }

    /**
     * Handle OAuth callback from Google.
     * Note: This endpoint is called by Google's servers, not the user's browser,
     * so we cannot rely on sessions or authenticated requests.
     * We use a signed state token to identify the user.
     */
    public function callback(Request $request): RedirectResponse
    {
        $state = $request->get('state');
        $code = $request->get('code');

        // Verify signed state and extract user_id
        $userId = $this->verifySignedState($state);
        if (!$userId) {
            // For debugging: show a simple error page
            return redirect(env('FRONTEND_URL', 'http://localhost:5173') . '/settings?gmail=error');
        }

        if (!$code) {
            return redirect(env('FRONTEND_URL', 'http://localhost:5173') . '/settings?gmail=error');
        }

        // Exchange authorization code for tokens
        $tokenResponse = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'client_id' => config('google.client_id'),
            'client_secret' => config('google.client_secret'),
            'redirect_uri' => config('google.redirect_uri'),
            'grant_type' => 'authorization_code',
            'code' => $code,
        ]);

        if (!$tokenResponse->successful()) {
            return redirect(env('FRONTEND_URL', 'http://localhost:5173') . '/settings?gmail=error');
        }

        $tokens = $tokenResponse->json();

        // Store refresh token on the user identified by the state
        $user = User::find($userId);
        if (!$user) {
            return redirect(env('FRONTEND_URL', 'http://localhost:5173') . '/settings?gmail=error');
        }

        // Google only returns refresh_token on first authorization
        // For subsequent authorizations, we may need to use the existing token
        $refreshToken = $tokens['refresh_token'] ?? null;

        if (!$refreshToken) {
            // If no new refresh token, redirect with error
            return redirect(env('FRONTEND_URL', 'http://localhost:5173') . '/settings?gmail=error&reason=no_refresh_token');
        }

        $user->update([
            'google_refresh_token' => encrypt($refreshToken),
            'gmail_connected_at' => now(),
        ]);

        // Redirect to frontend settings page with success status
        $frontendUrl = env('FRONTEND_URL', 'http://localhost:5173');
        return redirect("{$frontendUrl}/settings?gmail=connected");
    }

    /**
     * Disconnect Gmail from user's account.
     */
    public function disconnect(Request $request): JsonResponse
    {
        $user = $request->user();

        // Revoke token at Google if we have one
        if ($user->google_refresh_token) {
            try {
                $refreshToken = decrypt($user->google_refresh_token);
                Http::asForm()->post(config('google.revoke_uri'), [
                    'token' => $refreshToken,
                ]);
            } catch (\Exception $e) {
                // Continue with disconnect even if revocation fails
            }
        }

        $user->update([
            'google_refresh_token' => null,
            'gmail_connected_at' => null,
            'gmail_sync_frequency' => 'disabled',
        ]);

        return response()->json(['message' => 'Gmail disconnected successfully']);
    }

    /**
     * Get Gmail connection status for current user.
     */
    public function status(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'connected' => $user->isGmailConnected(),
            'connected_at' => $user->gmail_connected_at?->toISOString(),
            'sync_frequency' => $user->gmail_sync_frequency,
        ]);
    }

    /**
     * Update Gmail sync frequency preference.
     */
    public function updateSyncFrequency(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'frequency' => 'required|in:disabled,daily,weekly',
        ]);

        $request->user()->update([
            'gmail_sync_frequency' => $validated['frequency'],
        ]);

        return response()->json([
            'message' => 'Sync frequency updated',
            'sync_frequency' => $validated['frequency'],
        ]);
    }
}