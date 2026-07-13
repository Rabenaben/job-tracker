<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['username', 'password', 'google_refresh_token', 'gmail_connected_at', 'gmail_synced_at', 'gmail_sync_frequency'])]
#[Hidden(['password', 'remember_token', 'google_refresh_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable, HasApiTokens;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'password' => 'hashed',
            'gmail_connected_at' => 'datetime',
        ];
    }

    public function jobApplications()
    {
        return $this->hasMany(JobApplication::class);
    }

    public function isGmailConnected(): bool
    {
        return $this->google_refresh_token !== null;
    }
}
