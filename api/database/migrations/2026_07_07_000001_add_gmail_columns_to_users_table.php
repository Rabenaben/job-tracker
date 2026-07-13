<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->text('google_refresh_token')->nullable()->after('password');
            $table->timestamp('gmail_connected_at')->nullable()->after('google_refresh_token');
            $table->timestamp('gmail_synced_at')->nullable()->after('gmail_connected_at');
            $table->enum('gmail_sync_frequency', ['disabled', 'daily', 'weekly'])->default('disabled')->after('gmail_synced_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['google_refresh_token', 'gmail_connected_at', 'gmail_synced_at', 'gmail_sync_frequency']);
        });
    }
};