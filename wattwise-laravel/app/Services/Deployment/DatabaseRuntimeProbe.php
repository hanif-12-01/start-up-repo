<?php

namespace App\Services\Deployment;

use Illuminate\Support\Facades\DB;

class DatabaseRuntimeProbe
{
    public function probe(): DatabaseRuntimeContext
    {
        $connection = DB::connection();
        $connection->getPdo();
        $driver = strtolower($connection->getDriverName());
        $databaseName = (string) $connection->getDatabaseName();

        if ($databaseName === '') {
            $databaseName = null;
        } elseif ($driver === 'sqlite' && $databaseName !== ':memory:') {
            $databaseName = basename(str_replace('\\', '/', $databaseName));
        }

        return new DatabaseRuntimeContext($driver, $databaseName);
    }
}
