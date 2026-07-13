<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('job_applications', function (Blueprint $table) {
            $table->string('gmail_message_id')->nullable()->after('notes');
            $table->string('gmail_thread_id')->nullable()->after('gmail_message_id');
            $table->string('source')->nullable()->after('gmail_thread_id');
        });
    }

    public function down(): void
    {
        Schema::table('job_applications', function (Blueprint $table) {
            $table->dropColumn(['gmail_message_id', 'gmail_thread_id', 'source']);
        });
    }
};