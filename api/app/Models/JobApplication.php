<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class JobApplication extends Model
{
    protected $fillable = [
        'user_id', 'company', 'role', 'status',
        'job_url', 'notes', 'salary_range', 'applied_at'
    ];

    protected $casts = ['applied_at' => 'date'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
