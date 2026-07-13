<?php

use App\Http\Controllers\GoogleAuthController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

// Google OAuth callback - no /api prefix since it's the redirect_uri
Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback']);
