// Single team-wide incoming webhook (Slack "Incoming Webhooks" app, one URL per channel) —
// there's no per-task/per-user webhook storage, so this posts to whichever channel
// SLACK_WEBHOOK_URL points at for every task with slack_notifications_enabled.
export async function sendSlackMessage(text: string): Promise<void> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!webhookUrl) return;

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) {
    throw new Error(`Slack webhook failed: ${res.status} ${await res.text()}`);
  }
}
