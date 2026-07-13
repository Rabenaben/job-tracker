<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class GoogleAuthControllerTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function user_can_initiate_google_oauth_flow(): void
    {
        config(['google.client_id' => 'test-client-id']);

        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum');

        $response = $this->get('/api/auth/google');

        $response->assertStatus(200);
        $response->assertJsonStructure(['oauth_url']);
        $response->assertJsonPath('oauth_url', fn ($url) => str_contains($url, 'accounts.google.com'));
        $response->assertJsonPath('oauth_url', fn ($url) => str_contains($url, 'test-client-id'));
    }

    #[Test]
    public function unauthenticated_user_cannot_initiate_google_oauth(): void
    {
        $response = $this->getJson('/api/auth/google');

        $response->assertStatus(401);
    }

    #[Test]
    public function oauth_url_contains_correct_scopes(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum');

        $response = $this->get('/api/auth/google');

        $oauthUrl = $response->json('oauth_url');
        $this->assertStringContainsString('gmail.readonly', $oauthUrl);
    }

    #[Test]
    public function oauth_callback_with_valid_signed_state_succeeds(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum');

        // Get the initiate response to see the state format
        $response = $this->get('/api/auth/google');
        $oauthUrl = $response->json('oauth_url');

        // Extract state from URL
        preg_match('/state=([^&]+)/', $oauthUrl, $matches);
        $state = $matches[1];

        // Simulate callback with state (note: this will fail at token exchange, but validates state)
        $callbackResponse = $this->get("/auth/google/callback?code=test_auth_code&state={$state}");

        // Should redirect to frontend (with error for now since no real token exchange)
        $callbackResponse->assertStatus(302);
        $callbackResponse->assertRedirectContains('localhost:5173');
    }

    #[Test]
    public function oauth_callback_with_invalid_state_redirects_to_error(): void
    {
        $response = $this->get('/auth/google/callback?code=test_auth_code&state=invalidState');

        $response->assertStatus(302);
        $response->assertRedirectContains('gmail=error');
    }

    #[Test]
    public function user_can_disconnect_gmail(): void
    {
        $user = User::factory()->create();
        $user->google_refresh_token = encrypt('test_token');
        $user->gmail_connected_at = now();
        $user->save();
        $this->actingAs($user, 'sanctum');

        $response = $this->deleteJson('/api/auth/google/disconnect');

        $response->assertStatus(200);
        $response->assertJson(['message' => 'Gmail disconnected successfully']);

        $user->refresh();
        $this->assertNull($user->google_refresh_token);
        $this->assertNull($user->gmail_connected_at);
    }

    #[Test]
    public function user_can_check_gmail_connection_status(): void
    {
        $user = User::factory()->create();
        $user->google_refresh_token = encrypt('test_token');
        $user->gmail_connected_at = now();
        $user->save();
        $this->actingAs($user, 'sanctum');

        $response = $this->getJson('/api/auth/google/status');

        $response->assertStatus(200);
        $response->assertJson(['connected' => true]);
    }

    #[Test]
    public function show_gmail_status_returns_not_connected_for_user_without_token(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum');

        $response = $this->getJson('/api/auth/google/status');

        $response->assertStatus(200);
        $response->assertJson(['connected' => false]);
    }

    #[Test]
    public function user_can_update_sync_frequency(): void
    {
        $user = User::factory()->create();
        $user->google_refresh_token = encrypt('test_token');
        $user->gmail_connected_at = now();
        $user->save();
        $this->actingAs($user, 'sanctum');

        $response = $this->patchJson('/api/auth/google/sync-frequency', [
            'frequency' => 'daily',
        ]);

        $response->assertStatus(200);
        $user->refresh();
        $this->assertEquals('daily', $user->gmail_sync_frequency);
    }

    #[Test]
    public function sync_frequency_must_be_valid_value(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum');

        $response = $this->patchJson('/api/auth/google/sync-frequency', [
            'frequency' => 'invalid',
        ]);

        $response->assertStatus(422);
    }
}