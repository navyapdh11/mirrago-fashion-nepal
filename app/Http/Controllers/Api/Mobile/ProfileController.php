<?php

namespace App\Http\Controllers\Api\Mobile;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Http\Resources\UserResource;
use App\Models\Order;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class ProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        return response()->json([
            'user' => new UserResource($request->user()),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'phone' => ['sometimes', 'string', 'max:20'],
            'city' => ['sometimes', 'string', 'max:255'],
            'address' => ['sometimes', 'string', 'max:500'],
        ]);

        $user->update($validated);

        return response()->json([
            'message' => 'Profile updated',
            'user' => new UserResource($user->fresh()),
        ]);
    }

    public function updatePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'confirmed', Password::defaults()],
        ]);

        $user = $request->user();

        if (!Hash::check($validated['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['The current password is incorrect.'],
            ]);
        }

        $user->update([
            'password' => Hash::make($validated['password']),
        ]);

        return response()->json(['message' => 'Password updated successfully']);
    }

    public function orders(Request $request): JsonResponse
    {
        $query = Order::with(['items.product'])
            ->where('user_id', $request->user()->id);

        if ($request->filled('status')) {
            $query->byStatus($request->string('status'));
        }

        $perPage = $request->integer('per_page', 20);
        $orders = $query->latest()->paginate(min($perPage, 100));

        return response()->json($orders);
    }

    public function orderDetail(Request $request, string $orderId): JsonResponse
    {
        $order = Order::with(['items.product', 'items.variant', 'payments'])
            ->where('user_id', $request->user()->id)
            ->findOrFail($orderId);

        return response()->json([
            'order' => new OrderResource($order),
        ]);
    }

    public function addressesIndex(Request $request): JsonResponse
    {
        $user = $request->user();

        $addresses = collect();

        if ($user->address !== null || $user->city !== null) {
            $addresses->push([
                'id' => 'primary',
                'is_primary' => true,
                'name' => $user->name,
                'phone' => $user->phone,
                'address' => $user->address,
                'city' => $user->city,
            ]);
        }

        return response()->json(['addresses' => $addresses]);
    }

    public function addressesStore(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'address' => ['required', 'string', 'max:500'],
            'city' => ['required', 'string', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20'],
        ]);

        $user = $request->user();
        $user->update([
            'address' => $validated['address'],
            'city' => $validated['city'],
            'phone' => $validated['phone'] ?? $user->phone,
        ]);

        return response()->json([
            'message' => 'Address saved',
            'address' => [
                'id' => 'primary',
                'is_primary' => true,
                'name' => $user->name,
                'phone' => $user->phone,
                'address' => $user->address,
                'city' => $user->city,
            ],
        ], 201);
    }

    public function addressesUpdate(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'address' => ['sometimes', 'string', 'max:500'],
            'city' => ['sometimes', 'string', 'max:255'],
            'phone' => ['sometimes', 'string', 'max:20'],
        ]);

        $user = $request->user();
        $user->update($validated);

        return response()->json([
            'message' => 'Address updated',
            'address' => [
                'id' => 'primary',
                'is_primary' => true,
                'name' => $user->name,
                'phone' => $user->phone,
                'address' => $user->address,
                'city' => $user->city,
            ],
        ]);
    }

    public function addressesDestroy(Request $request): JsonResponse
    {
        $user = $request->user();
        $user->update([
            'address' => null,
            'city' => null,
        ]);

        return response()->json(['message' => 'Address removed']);
    }
}
