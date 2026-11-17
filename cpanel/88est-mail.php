<?php
// =====================================================================
// 88EST - Kutuma email kupitia cPanel ya hugotech.co.tz (BURE)
// Weka faili hili kwenye cPanel: public_html/88est-mail.php
// Kisha kwenye Railway weka:
//   MAIL_RELAY_URL = https://hugotech.co.tz/88est-mail.php
//   MAIL_RELAY_KEY = (siri ile ile uliyoweka hapa chini)
// =====================================================================

$SECRET    = 'BADILISHA_HAPA_WEKA_SIRI_NDEFU';   // badilisha! (herufi 30+)
$FROM      = 'no-reply@hugotech.co.tz';          // fungua email hii kwenye cPanel > Email Accounts
$FROM_NAME = '88EST';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit(json_encode(['ok' => false, 'error' => 'method']));
}

$data = json_decode(file_get_contents('php://input'), true);
if (!is_array($data)) $data = [];

$key = $_SERVER['HTTP_X_RELAY_KEY'] ?? ($data['key'] ?? '');
if ($SECRET === 'BADILISHA_HAPA_WEKA_SIRI_NDEFU' || !hash_equals($SECRET, (string)$key)) {
    http_response_code(403);
    exit(json_encode(['ok' => false, 'error' => 'key']));
}

$to = filter_var($data['to'] ?? '', FILTER_VALIDATE_EMAIL);
if (!$to) {
    http_response_code(400);
    exit(json_encode(['ok' => false, 'error' => 'to']));
}

$subject = mb_substr(preg_replace('/[\r\n]+/', ' ', (string)($data['subject'] ?? '88EST')), 0, 150);
$html    = (string)($data['html'] ?? '');
$text    = trim(html_entity_decode(strip_tags(str_replace(['<br>', '</p>', '</div>'], "\n", $html))));

// Email yenye sehemu mbili: maandishi ya kawaida + HTML
$boundary = 'b' . md5(uniqid('', true));
$headers  = "MIME-Version: 1.0\r\n";
$headers .= "From: =?UTF-8?B?" . base64_encode($FROM_NAME) . "?= <$FROM>\r\n";
$headers .= "Reply-To: $FROM\r\n";
$headers .= "Content-Type: multipart/alternative; boundary=\"$boundary\"\r\n";

$body  = "--$boundary\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n";
$body .= chunk_split(base64_encode($text)) . "\r\n";
$body .= "--$boundary\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n";
$body .= chunk_split(base64_encode($html)) . "\r\n";
$body .= "--$boundary--";

$ok = mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, $headers, '-f' . $FROM);
echo json_encode(['ok' => (bool)$ok]);
