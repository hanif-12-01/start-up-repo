<?php

return [
    /*
    | Server-generated monthly reports are opt-in. Production remains
    | fail-closed unless the deployment owner deliberately enables them.
    */
    'enabled' => env('PDF_REPORTS_ENABLED', false),
];
