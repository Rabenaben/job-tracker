<?php

namespace App\Http\Controllers;

use App\Services\GmailSyncService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class GmailSyncController extends Controller
{
    /**
     * Trigger Gmail sync for the authenticated user.
     */
    public function sync(Request $request): JsonResponse
    {
        $user = $request->user();

        // Check if Gmail is connected
        if (!$user->isGmailConnected()) {
            return response()->json([
                'error' => 'Gmail account not connected',
            ], 400);
        }

        try {
            $syncService = new GmailSyncService($user);
            $summary = $syncService->sync();

            return response()->json([
                'success' => true,
                'summary' => $summary,
            ]);
        } catch (\RuntimeException $e) {
            if ($e->getMessage() === 'Gmail account not connected') {
                return response()->json([
                    'error' => 'Gmail account not connected. Please reconnect your Gmail account.',
                ], 400);
            }

            return response()->json([
                'error' => 'Sync failed',
                'message' => $e->getMessage(),
            ], 500);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Sync failed',
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}