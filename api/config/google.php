<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Google OAuth Configuration
    |--------------------------------------------------------------------------
    |
    | Configure your Google OAuth credentials. Get these from the Google
    | Cloud Console: https://console.cloud.google.com/apis/credentials
    |
    */

    'client_id' => env('GOOGLE_CLIENT_ID'),

    'client_secret' => env('GOOGLE_CLIENT_SECRET'),

    'redirect_uri' => env('GOOGLE_REDIRECT_URI', 'http://localhost:8000/auth/google/callback'),

    /*
    |--------------------------------------------------------------------------
    | OAuth Scopes
    |--------------------------------------------------------------------------
    |
    | The scopes to request from Google. gmail.readonly gives read-only
    | access to the user's Gmail messages.
    |
    */

    'scopes' => [
        'https://www.googleapis.com/auth/gmail.readonly',
    ],

    /*
    |--------------------------------------------------------------------------
    | OAuth Parameters
    |--------------------------------------------------------------------------
    */

    'approval_prompt' => 'force',

    'access_type' => 'offline',

    /*
    |--------------------------------------------------------------------------
    | Token Revocation URL
    |--------------------------------------------------------------------------
    */

    'revoke_uri' => 'https://oauth2.googleapis.com/revoke',
];