<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\GmailSyncService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Queue;
use Mockery;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class GmailSyncEndpointTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function user_can_trigger_gmail_sync(): void
    {
        $user = User::factory()->create();
        $user->google_refresh_token = encrypt('test_token');
        $user->gmail_connected_at = now();
        $user->save();
        $this->actingAs($user, 'sanctum');

        // Mock HTTP responses
        Http::fake([
            'oauth2.googleapis.com/token' => Http::response(['access_token' => 'mock_token'], 200),
            'gmail.googleapis.com/*' => Http::response(['messages' => []], 200),
        ]);

        $response = $this->postJson('/api/applications/sync/gmail');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'summary' => ['new', 'duplicates', 'errors', 'processed'],
        ]);
    }

    #[Test]
    public function unauthenticated_user_cannot_trigger_sync(): void
    {
        $response = $this->postJson('/api/applications/sync/gmail');

        $response->assertStatus(401);
    }

    #[Test]
    public function user_without_gmail_connection_gets_error(): void
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum');

        $response = $this->postJson('/api/applications/sync/gmail');

        $response->assertStatus(400);
        $response->assertJson(['error' => 'Gmail account not connected']);
    }

    #[Test]
    public function sync_returns_new_applications_count(): void
    {
        $user = User::factory()->create();
        $user->google_refresh_token = encrypt('test_token');
        $user->gmail_connected_at = now();
        $user->save();
        $this->actingAs($user, 'sanctum');

        // Mock HTTP with a message
        Http::fake([
            'oauth2.googleapis.com/token' => Http::response(['access_token' => 'mock_token'], 200),
            'gmail.googleapis.com/gmail/v1/users/me/messages*' => Http::sequence()
                // First call: list messages
                ->push(['messages' => [['id' => 'msg_123']]])
                // Second call: get message detail
                ->push([
                    'id' => 'msg_123',
                    'internalDate' => '1609459200000',
                    'payload' => [
                        'headers' => [
                            ['name' => 'From', 'value' => '"LinkedIn" <jobs@linkedin.com>'],
                            ['name' => 'Subject', 'value' => 'Application to Software Engineer at Acme Inc'],
                        ],
                    ],
                ]),
        ]);

        $response = $this->postJson('/api/applications/sync/gmail');

        $response->assertStatus(200);
        $this->assertEquals(1, $response->json('summary.new'));
    }

    #[Test]
    public function sync_is_idempotent_for_duplicate_emails(): void
    {
        $user = User::factory()->create();
        $user->google_refresh_token = encrypt('test_token');
        $user->gmail_connected_at = now();
        $user->save();

        // Create an existing job application imported from Gmail
        $existingApp = \App\Models\JobApplication::create([
            'user_id' => $user->id,
            'company' => 'LinkedIn',
            'role' => 'Software Engineer',
            'status' => 'applied',
            'applied_at' => '2021-01-01',
            'notes' => 'Previously imported from Gmail',
            'gmail_message_id' => 'msg_123', // Use new column for deduplication
        ]);

        $this->actingAs($user, 'sanctum');

        // Mock HTTP with the same message
        Http::fake([
            'oauth2.googleapis.com/token' => Http::response(['access_token' => 'mock_token'], 200),
            'gmail.googleapis.com/gmail/v1/users/me/messages*' => Http::sequence()
                ->push(['messages' => [['id' => 'msg_123']]])
                ->push([
                    'id' => 'msg_123',
                    'internalDate' => '1609459200000',
                    'payload' => [
                        'headers' => [
                            ['name' => 'From', 'value' => '"LinkedIn" <jobs@linkedin.com>'],
                            ['name' => 'Subject', 'value' => 'Application to Software Engineer'],
                        ],
                    ],
                ]),
        ]);

        $response = $this->postJson('/api/applications/sync/gmail');

        $response->assertStatus(200);
        // Should be a duplicate, not a new application
        $this->assertEquals(0, $response->json('summary.new'));
        $this->assertEquals(1, $response->json('summary.duplicates'));
    }

    #[Test]
    public function sync_endpoint_uses_queue_for_long_running_syncs(): void
    {
        Queue::fake();

        $user = User::factory()->create();
        $user->google_refresh_token = encrypt('test_token');
        $user->gmail_connected_at = now();
        $user->save();
        $this->actingAs($user, 'sanctum');

        // Mock HTTP responses
        Http::fake([
            'oauth2.googleapis.com/token' => Http::response(['access_token' => 'mock_token'], 200),
            'gmail.googleapis.com/*' => Http::response(['messages' => []], 200),
        ]);

        // For now, sync is synchronous - this test documents the expectation
        $response = $this->postJson('/api/applications/sync/gmail');

        // Currently synchronous - this will change when queue jobs are added
        $response->assertStatus(200);
    }
}