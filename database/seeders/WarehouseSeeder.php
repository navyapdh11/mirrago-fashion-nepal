<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Warehouse;

class WarehouseSeeder extends Seeder
{
    protected array $warehouseData = [
        [
            'name' => 'Kathmandu Central Warehouse',
            'code' => 'KTM-001',
            'city' => 'Kathmandu',
            'address' => 'Thamel, Kathmandu 44600',
            'contact_number' => '+977-1-4700123',
            'manager_name' => 'Ram Shrestha',
            'is_active' => true,
            'operating_hours' => [
                'sunday' => ['open' => '09:00', 'close' => '18:00'],
                'monday' => ['open' => '09:00', 'close' => '18:00'],
                'tuesday' => ['open' => '09:00', 'close' => '18:00'],
                'wednesday' => ['open' => '09:00', 'close' => '18:00'],
                'thursday' => ['open' => '09:00', 'close' => '18:00'],
                'friday' => ['open' => '09:00', 'close' => '15:00'],
                'saturday' => ['open' => '10:00', 'close' => '14:00'],
            ],
            'latitude' => 27.7172,
            'longitude' => 85.3240,
        ],
        [
            'name' => 'Birgunj Distribution Center',
            'code' => 'BRG-002',
            'city' => 'Birgunj',
            'address' => 'Adarsh Kotwal, Birgunj 44300',
            'contact_number' => '+977-51-523456',
            'manager_name' => 'Sita Devi Yadav',
            'is_active' => true,
            'operating_hours' => [
                'sunday' => ['open' => '08:00', 'close' => '17:00'],
                'monday' => ['open' => '08:00', 'close' => '17:00'],
                'tuesday' => ['open' => '08:00', 'close' => '17:00'],
                'wednesday' => ['open' => '08:00', 'close' => '17:00'],
                'thursday' => ['open' => '08:00', 'close' => '17:00'],
                'friday' => ['open' => '08:00', 'close' => '14:00'],
                'saturday' => ['open' => '09:00', 'close' => '13:00'],
            ],
            'latitude' => 27.0105,
            'longitude' => 84.2855,
        ],
        [
            'name' => 'Nepalgunj Regional Warehouse',
            'code' => 'NGJ-003',
            'city' => 'Nepalgunj',
            'address' => 'Dhambojadi Chowk, Nepalgunj 21600',
            'contact_number' => '+977-81-540789',
            'manager_name' => 'Mohammad Khan',
            'is_active' => true,
            'operating_hours' => [
                'sunday' => ['open' => '09:00', 'close' => '17:00'],
                'monday' => ['open' => '09:00', 'close' => '17:00'],
                'tuesday' => ['open' => '09:00', 'close' => '17:00'],
                'wednesday' => ['open' => '09:00', 'close' => '17:00'],
                'thursday' => ['open' => '09:00', 'close' => '17:00'],
                'friday' => ['open' => '09:00', 'close' => '14:00'],
                'saturday' => ['open' => '10:00', 'close' => '13:00'],
            ],
            'latitude' => 28.0504,
            'longitude' => 81.6172,
        ],
        [
            'name' => 'Pokhara Warehouse',
            'code' => 'PKR-004',
            'city' => 'Pokhara',
            'address' => 'Lakeside Road, Pokhara 33700',
            'contact_number' => '+977-61-465432',
            'manager_name' => 'Hari Gurung',
            'is_active' => true,
            'operating_hours' => [
                'sunday' => ['open' => '09:00', 'close' => '18:00'],
                'monday' => ['open' => '09:00', 'close' => '18:00'],
                'tuesday' => ['open' => '09:00', 'close' => '18:00'],
                'wednesday' => ['open' => '09:00', 'close' => '18:00'],
                'thursday' => ['open' => '09:00', 'close' => '18:00'],
                'friday' => ['open' => '09:00', 'close' => '15:00'],
                'saturday' => ['open' => '10:00', 'close' => '14:00'],
            ],
            'latitude' => 28.2096,
            'longitude' => 83.9856,
        ],
        [
            'name' => 'Biratnagar Warehouse',
            'code' => 'BRT-005',
            'city' => 'Biratnagar',
            'address' => 'Main Road, Biratnagar 56613',
            'contact_number' => '+977-21-467890',
            'manager_name' => 'Gita Rai',
            'is_active' => true,
            'operating_hours' => [
                'sunday' => ['open' => '09:00', 'close' => '17:00'],
                'monday' => ['open' => '09:00', 'close' => '17:00'],
                'tuesday' => ['open' => '09:00', 'close' => '17:00'],
                'wednesday' => ['open' => '09:00', 'close' => '17:00'],
                'thursday' => ['open' => '09:00', 'close' => '17:00'],
                'friday' => ['open' => '09:00', 'close' => '14:00'],
                'saturday' => ['open' => '10:00', 'close' => '13:00'],
            ],
            'latitude' => 26.4525,
            'longitude' => 87.2718,
        ],
    ];

    public function run(): void
    {
        foreach ($this->warehouseData as $warehouse) {
            Warehouse::updateOrCreate(
                ['code' => $warehouse['code']],
                $warehouse
            );
        }

        $this->command->info('Warehouses created successfully!');
    }
}
