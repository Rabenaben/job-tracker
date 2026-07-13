<?php

namespace Tests\Unit\Database;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class AddGmailColumnsToUsersTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function users_table_has_gmail_columns_after_migration(): void
    {
        $columns = Schema::getColumnListing('users');

        $this->assertContains('google_refresh_token', $columns);
        $this->assertContains('gmail_connected_at', $columns);
        $this->assertContains('gmail_sync_frequency', $columns);
    }

    #[Test]
    public function gmail_sync_frequency_defaults_to_disabled(): void
    {
        $user = \App\Models\User::create([
            'username' => 'testuser_' . \uniqid(),
            'password' => bcrypt('password'),
        ]);

        $this->assertEquals('disabled', $user->fresh()->gmail_sync_frequency);
    }

    #[Test]
    public function new_user_is_not_connected_to_gmail_by_default(): void
    {
        $user = \App\Models\User::create([
            'username' => 'testuser_' . \uniqid(),
            'password' => bcrypt('password'),
        ]);

        $this->assertNull($user->fresh()->google_refresh_token);
        $this->assertNull($user->fresh()->gmail_connected_at);
    }
}