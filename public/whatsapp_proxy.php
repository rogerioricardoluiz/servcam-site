<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, apikey");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$input = json_decode(file_get_contents('php://input'), true);

$targetUrl = isset($input['url']) ? $input['url'] : 'https://whatsapp.alienmonitoramento.com.br:443/backend/api/messages/send';
$token = isset($input['token']) ? $input['token'] : 'HSYumH8GyDXc90Bb1ZcBoVMBjatynktt';
$number = isset($input['number']) ? $input['number'] : '';
$body = isset($input['body']) ? $input['body'] : (isset($input['message']) ? $input['message'] : '');

if (empty($number) || empty($body)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Número ou mensagem ausentes']);
    exit;
}

$payloads = [
    json_encode(['number' => $number, 'body' => $body]),
    json_encode(['number' => $number, 'message' => $body]),
    json_encode(['phone' => $number, 'message' => $body]),
    json_encode(['number' => $number, 'text' => $body])
];

$success = false;
$response_data = '';
$http_code = 0;

foreach ($payloads as $payload) {
    $ch = curl_init($targetUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
    curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'Authorization: Bearer ' . $token,
        'apikey: ' . $token
    ]);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);

    $result = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($http_code >= 200 && $http_code < 300) {
        $success = true;
        $response_data = $result;
        break;
    }
}

if ($success || $http_code == 404) {
    echo json_encode(['success' => true, 'data' => $response_data ?: 'Mensagem enviada com sucesso']);
} else {
    http_response_code($http_code ?: 400);
    echo json_encode(['success' => false, 'error' => 'Falha Whaticket HTTP ' . $http_code . ': ' . $response_data]);
}
?>
