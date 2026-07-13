<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\GmailSyncController;
use App\Http\Controllers\GoogleAuthController;
use App\Http\Controllers\JobApplicationController;
use Illuminate\Support\Facades\Route;

Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);

    // Google OAuth routes
    Route::get('/auth/google', [GoogleAuthController::class, 'initiate']);
    Route::get('/auth/google/callback', [GoogleAuthController::class, 'callback']);
    Route::delete('/auth/google/disconnect', [GoogleAuthController::class, 'disconnect']);
    Route::get('/auth/google/status', [GoogleAuthController::class, 'status']);
    Route::patch('/auth/google/sync-frequency', [GoogleAuthController::class, 'updateSyncFrequency']);

    Route::get('/applications', [JobApplicationController::class, 'index']);
    Route::post('/applications', [JobApplicationController::class, 'store']);
    Route::patch('/applications/{jobApplication}', [JobApplicationController::class, 'update']);
    Route::patch('/applications/{jobApplication}/status', [JobApplicationController::class, 'updateStatus']);
    Route::delete('/applications/{jobApplication}', [JobApplicationController::class, 'destroy']);

    // Gmail sync
    Route::post('/applications/sync/gmail', [GmailSyncController::class, 'sync']);
});
