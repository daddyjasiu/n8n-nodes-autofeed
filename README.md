# n8n-nodes-autofeed

n8n community nodes for the [AutoFeed.ai Video API](https://www.autofeed.ai/video-api). Make faceless short-form videos (AI slideshows, Reddit stories, Would You Rather, Pick One, fake texts, UGC ads, AI video from Veo, Kling, Seedance and more, and YouTube clips) from any n8n workflow, then post them with the rest of your pipeline.

[n8n](https://n8n.io/) is a fair-code licensed workflow automation platform.

- [Installation](#installation)
- [Credentials](#credentials)
- [Operations](#operations)
- [Getting the finished video](#getting-the-finished-video)
- [Example workflows](#example-workflows)
- [Compatibility](#compatibility)
- [Resources](#resources)

## Installation

Follow the [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/): in n8n open **Settings > Community Nodes > Install** and enter `n8n-nodes-autofeed`.

## Credentials

You need an AutoFeed API key. The API is included with the AutoFeed **Ultimate** plan.

1. Sign in at [autofeed.ai](https://www.autofeed.ai), open **Dashboard > API Keys** and create a key (it starts with `af_live_`).
2. In n8n, create an **AutoFeed API** credential and paste the key. n8n checks it against `GET /v1/me`.

## Operations

**AutoFeed** node

| Resource | Operation | What it does |
|---|---|---|
| Video | Create | Starts a video of any type. Credits are charged when AutoFeed accepts it and refunded in full if it fails. |
| Video | Get | Status and MP4 URL of one video. |
| Video | Get Many | Videos made with the API, newest first, filterable by type and status. |
| Account | Get | Credit balance, plan, rate limits and videos in flight. |
| Video Type | Get Many | Every type with its price, example input and JSON Schema. |

Create Video shows the main fields of the chosen type (topic, category, duration, language, music, format, AI video model with its durations and resolutions, and so on). The long lists are read from the live API, so new categories, tracks and models appear without a node update. AI Video also has an **Extend Video** mode: give it a **Video URL** (up to 30 seconds) and it returns that video followed by an AI continuation. The **AI Image** type makes one image per item, with the model, ratio and quality picked from the live list. Any other input field goes in **Extra Input (JSON)**, merged over the fields above. Every field is listed in the [API docs](https://www.autofeed.ai/docs/api).

Create Video also takes:

- **Webhook URL**: where AutoFeed posts the finished video.
- **Idempotency Key**: a retry with the same key and the same request returns the original video and charges nothing. Use something unique per video, like a sheet row number.
- **Wait for Completion**: keeps checking until the video is completed or failed and outputs the final result.

**AutoFeed Trigger** node

Polls for videos that completed (or failed) and starts the workflow once per video. The first poll after activation only records existing videos, so turning a workflow on does not replay old ones.

## Getting the finished video

Rendering takes a few minutes. Three ways to continue when it is done:

1. **Wait node (recommended on n8n Cloud).** Set Create Video's Webhook URL to `{{ $execution.resumeUrl }}` and follow it with a **Wait** node set to *Resume: On Webhook Call*, *HTTP Method: POST*. The Wait node resumes with the finished video in `$json.body`. Your n8n must be reachable on public https.
2. **Wait for Completion.** Turn it on in Create Video. Simplest, works on a local n8n, but keeps the execution running while the video renders.
3. **AutoFeed Trigger.** A separate workflow that runs for every finished video, whoever started it.

AutoFeed signs every webhook with `X-Autofeed-Signature` (HMAC-SHA256). The verification steps are in the [API docs](https://www.autofeed.ai/docs/api#webhooks).

## Example workflows

Import-ready templates (built-in n8n nodes only) are at [autofeed.ai/integrations/n8n](https://www.autofeed.ai/integrations/n8n):

- Google Sheet of topics to YouTube Shorts
- RSS news to a daily AI slideshow
- New sheet row to a Would You Rather video

## Compatibility

Built with `@n8n/node-cli` 0.54 against `n8n-workflow` 2.x. Tested on n8n 2.45.

## Resources

- [AutoFeed Video API](https://www.autofeed.ai/video-api)
- [API guide](https://www.autofeed.ai/docs/api) and [OpenAPI spec](https://www.autofeed.ai/openapi-v1.json)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/#community-nodes)

## License

[MIT](LICENSE.md)
