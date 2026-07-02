<?php

namespace App\Http\Controllers;

use App\Models\JobApplication;
use Illuminate\Http\Request;

class JobApplicationController extends Controller
{
    public function index(Request $request)
    {
        return $request->user()->jobApplications()->orderByDesc('applied_at')->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'company' => 'required|string|max:255',
            'role' => 'required|string|max:255',
            'status' => 'in:applied,interviewing,offer,rejected,ghosted',
            'job_url' => 'nullable|url',
            'notes' => 'nullable|string',
            'salary_range' => 'nullable|string',
            'applied_at' => 'required|date',
        ]);

        $validated['status'] = $validated['status'] ?? 'applied'; // <-- add this

        $application = $request->user()->jobApplications()->create($validated);

        return response()->json($application, 201);
    }

    public function update(Request $request, JobApplication $jobApplication)
    {
        $this->authorizeOwner($request, $jobApplication);

        $validated = $request->validate([
            'company' => 'sometimes|string|max:255',
            'role' => 'sometimes|string|max:255',
            'job_url' => 'nullable|url',
            'notes' => 'nullable|string',
            'salary_range' => 'nullable|string',
            'applied_at' => 'sometimes|date',
        ]);

        $jobApplication->update($validated);
        return response()->json($jobApplication);
    }

    public function updateStatus(Request $request, JobApplication $jobApplication)
    {
        $this->authorizeOwner($request, $jobApplication);

        $validated = $request->validate([
            'status' => 'required|in:applied,interviewing,offer,rejected,ghosted',
        ]);

        $jobApplication->update($validated);
        return response()->json($jobApplication);
    }

    public function destroy(Request $request, JobApplication $jobApplication)
    {
        $this->authorizeOwner($request, $jobApplication);
        $jobApplication->delete();
        return response()->json(['message' => 'Deleted']);
    }

    private function authorizeOwner(Request $request, JobApplication $jobApplication)
    {
        if ($jobApplication->user_id !== $request->user()->id) {
            abort(403, 'Unauthorized');
        }
    }
}
