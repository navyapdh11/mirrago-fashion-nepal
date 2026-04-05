<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            WarehouseSeeder::class,
            ProductSeeder::class,
        ]);

        $this->command->info('Database seeding completed!');
    }
}
