import type { INodeProperties } from 'n8n-workflow';

export const VIDEO_TYPES = [
	{
		name: 'AI Image',
		value: 'ai_image',
		description: 'One image from an AI image model (Nano Banana, GPT Image, FLUX, Seedream and more)',
	},
	{
		name: 'AI Slideshow',
		value: 'ai_slideshow',
		description: 'Narrated AI image slideshow with captions, from a topic or a preset niche',
	},
	{
		name: 'AI Video',
		value: 'ai_video',
		description:
			'A clip from a text-to-video or image-to-video model (Veo, Kling, Seedance and more), or a continuation of your own video',
	},
	{
		name: 'Fake Text',
		value: 'fake_text',
		description: 'An animated text-message conversation with voices',
	},
	{
		name: 'Pick One',
		value: 'pick_one',
		description: 'A "pick one" image challenge video',
	},
	{
		name: 'Reddit Stories',
		value: 'reddit_stories',
		description: 'A narrated Reddit post over gameplay footage',
	},
	{
		name: 'UGC Ad',
		value: 'ugc',
		description: 'A UGC-style ad: avatar reaction clip, hook text and an optional demo clip',
	},
	{
		name: 'Would You Rather',
		value: 'would_you_rather',
		description: 'Would You Rather comparisons with AI images and a vote reveal',
	},
	{
		name: 'YouTube Clips',
		value: 'yt_clips',
		description: 'Cut a long YouTube video into captioned vertical clips',
	},
];

const create = { resource: ['video'], operation: ['create'] };
const forTypes = (...types: string[]) => ({ show: { ...create, type: types } });

const FORMAT_OPTIONS = [
	{ name: 'Vertical 9:16 (1080x1920)', value: '9:16' },
	{ name: 'Horizontal 16:9 (1920x1080)', value: '16:9' },
	{ name: 'Square 1:1 (1280x1280)', value: '1:1' },
];

const SUBSTYLE_OPTIONS = ['Realistic', 'Cartoony', 'Anime', 'Cyberpunk', 'Retro', 'Painting', 'Comic'].map(
	(value) => ({ name: value, value }),
);

const BACKGROUNDS = ['Minecraft', 'GTA V', 'Subway Surfers', 'Fortnite', 'Satisfying'];

export const videoOperations: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['video'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Create a video',
				description: 'Start a generation. Credits are charged when it is accepted and refunded if it fails.',
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get a video',
				description: 'Get the status and URL of one generation',
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many videos',
				description: 'List generations made with the API, newest first',
			},
		],
		default: 'create',
	},
];

export const videoFields: INodeProperties[] = [
	// ---------- create ----------
	{
		displayName: 'Video Type',
		name: 'type',
		type: 'options',
		noDataExpression: true,
		required: true,
		displayOptions: { show: create },
		options: VIDEO_TYPES,
		default: 'ai_slideshow',
	},

	// AI Slideshow
	{
		displayName: 'Category Name or ID',
		name: 'category',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getSlideshowCategories' },
		displayOptions: forTypes('ai_slideshow'),
		default: 'Write Your Own Story',
		description:
			'A preset niche, or Write Your Own Story to use the topic below. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Topic',
		name: 'topic',
		type: 'string',
		typeOptions: { rows: 3 },
		displayOptions: forTypes('ai_slideshow'),
		default: '',
		placeholder: 'Three habits that quietly double your focus',
		description: 'What the video is about. Needed for Write Your Own Story; optional for a preset category.',
	},
	{
		displayName: 'Duration',
		name: 'duration',
		type: 'options',
		displayOptions: forTypes('ai_slideshow'),
		options: [
			{ name: '15 to 30 Seconds', value: '15 to 30 seconds' },
			{ name: '45 to 60 Seconds', value: '45 to 60 seconds' },
			{ name: '60 to 90 Seconds', value: '60 to 90 seconds' },
		],
		default: '15 to 30 seconds',
		description: 'Longer videos cost more credits',
	},
	{
		displayName: 'Language Name or ID',
		name: 'language',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getLanguages' },
		displayOptions: forTypes('ai_slideshow'),
		default: 'English (USA)',
		description:
			'Language of the script and voice. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},

	// Would You Rather, Pick One, Fake Text
	{
		displayName: 'Topic',
		name: 'topic',
		type: 'string',
		typeOptions: { rows: 2 },
		required: true,
		displayOptions: forTypes('would_you_rather', 'pick_one', 'fake_text'),
		default: '',
		placeholder: 'Superpowers',
		description: 'What the video is about. The script is written from it.',
	},
	{
		displayName: 'Number of Comparisons',
		name: 'numberOfComparisons',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 10 },
		displayOptions: forTypes('would_you_rather'),
		default: 8,
	},
	{
		displayName: 'Number of Images',
		name: 'numberOfImages',
		type: 'number',
		typeOptions: { minValue: 3, maxValue: 10 },
		displayOptions: forTypes('pick_one'),
		default: 5,
		description: 'More than 5 images costs more credits',
	},
	{
		displayName: 'Number of Messages',
		name: 'numberOfMessages',
		type: 'number',
		typeOptions: { minValue: 6, maxValue: 14 },
		displayOptions: forTypes('fake_text'),
		default: 10,
	},
	{
		displayName: 'Image Style',
		name: 'substyle',
		type: 'options',
		displayOptions: forTypes('ai_slideshow', 'pick_one'),
		options: SUBSTYLE_OPTIONS,
		default: 'Realistic',
	},
	{
		displayName: 'Theme',
		name: 'theme',
		type: 'options',
		displayOptions: forTypes('fake_text'),
		options: [
			{ name: 'Dark', value: 'dark' },
			{ name: 'Light', value: 'light' },
		],
		default: 'dark',
	},

	// Reddit Stories
	{
		displayName: 'Subreddit',
		name: 'subreddit',
		type: 'string',
		displayOptions: forTypes('reddit_stories'),
		default: 'AskReddit',
		description: 'Without the r/ prefix',
	},
	{
		displayName: 'Background Footage',
		name: 'backgroundCategory',
		type: 'options',
		displayOptions: forTypes('reddit_stories'),
		options: BACKGROUNDS.map((value) => ({ name: value, value })),
		default: 'Minecraft',
	},
	{
		displayName: 'Background Footage',
		name: 'backgroundCategory',
		type: 'options',
		displayOptions: forTypes('fake_text'),
		options: ['None', ...BACKGROUNDS].map((value) => ({ name: value, value })),
		default: 'None',
	},

	// UGC
	{
		displayName: 'Hook',
		name: 'hook',
		type: 'string',
		required: true,
		displayOptions: forTypes('ugc'),
		default: '',
		placeholder: 'I stopped editing videos and my channel grew anyway',
		description: 'The text shown over the avatar clip',
	},
	{
		displayName: 'Avatar Clip Name or ID',
		name: 'avatarSrc',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getUgcAvatars' },
		displayOptions: forTypes('ugc'),
		default: '/ugc-templates/1.mp4',
		description:
			'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
	},
	{
		displayName: 'Demo Clip URL',
		name: 'demoSrc',
		type: 'string',
		displayOptions: forTypes('ugc'),
		default: '',
		placeholder: 'https://example.com/demo.mp4',
		description: 'Optional public https:// MP4 shown after the hook, for example a product demo',
	},

	// AI Video
	{
		displayName: 'Model Name or ID',
		name: 'model',
		type: 'options',
		required: true,
		typeOptions: { loadOptionsMethod: 'getAiVideoModels' },
		displayOptions: forTypes('ai_video'),
		default: '',
		description:
			'Prices differ per model, duration and resolution. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Mode',
		name: 'mode',
		type: 'options',
		displayOptions: forTypes('ai_video'),
		options: [
			{ name: 'Text to Video', value: 'text_to_video' },
			{ name: 'Image to Video', value: 'image_to_video' },
			{ name: 'Extend Video', value: 'extend_video' },
		],
		default: 'text_to_video',
	},
	{
		displayName: 'Prompt',
		name: 'textPrompt',
		type: 'string',
		typeOptions: { rows: 3 },
		required: true,
		displayOptions: forTypes('ai_video'),
		default: '',
		placeholder: 'A tiny robot pouring latte art in a sunny cafe, slow push in',
	},
	{
		displayName: 'Image URL',
		name: 'imageUrl',
		type: 'string',
		required: true,
		displayOptions: { show: { ...create, type: ['ai_video'], mode: ['image_to_video'] } },
		default: '',
		description: 'Public https:// URL of the starting frame',
	},
	{
		displayName: 'Video URL',
		name: 'videoUrl',
		type: 'string',
		required: true,
		displayOptions: { show: { ...create, type: ['ai_video'], mode: ['extend_video'] } },
		default: '',
		description:
			'Public https:// URL of the video to continue (up to 30 seconds and 100 MB). The result is this video followed by the new clip.',
	},
	{
		displayName: 'Duration (Seconds) Name or ID',
		name: 'aiDuration',
		type: 'options',
		required: true,
		typeOptions: { loadOptionsMethod: 'getAiVideoDurations', loadOptionsDependsOn: ['model'] },
		displayOptions: forTypes('ai_video'),
		default: '',
		description:
			'Durations the chosen model sells. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Resolution Name or ID',
		name: 'resolution',
		type: 'options',
		required: true,
		typeOptions: { loadOptionsMethod: 'getAiVideoResolutions', loadOptionsDependsOn: ['model'] },
		displayOptions: forTypes('ai_video'),
		default: '',
		description:
			'Resolutions the chosen model sells. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},

	// AI Image
	{
		displayName: 'Image Model Name or ID',
		name: 'imageModel',
		type: 'options',
		required: true,
		typeOptions: { loadOptionsMethod: 'getAiImageModels' },
		displayOptions: forTypes('ai_image'),
		default: '',
		description:
			'Prices differ per model and quality. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Prompt',
		name: 'prompt',
		type: 'string',
		typeOptions: { rows: 3 },
		required: true,
		displayOptions: forTypes('ai_image'),
		default: '',
		placeholder: 'A cozy coffee shop on a rainy evening, warm light, photoreal',
	},
	{
		displayName: 'Ratio Name or ID',
		name: 'ratio',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getAiImageRatios', loadOptionsDependsOn: ['imageModel'] },
		displayOptions: forTypes('ai_image'),
		default: '',
		description:
			'Ratios the chosen model renders. Empty uses its first. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Quality Name or ID',
		name: 'quality',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getAiImageQualities', loadOptionsDependsOn: ['imageModel'] },
		displayOptions: forTypes('ai_image'),
		default: '',
		description:
			'Qualities the chosen model sells, with their price. Empty uses the default. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},

	// YouTube Clips
	{
		displayName: 'YouTube URL',
		name: 'youtubeUrl',
		type: 'string',
		required: true,
		displayOptions: forTypes('yt_clips'),
		default: '',
		placeholder: 'https://www.youtube.com/watch?v=...',
	},
	{
		displayName: 'Number of Clips',
		name: 'clipCount',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 8 },
		displayOptions: forTypes('yt_clips'),
		default: 5,
	},

	// Shared
	{
		displayName: 'Music Name or ID',
		name: 'music',
		type: 'options',
		typeOptions: { loadOptionsMethod: 'getMusic', loadOptionsDependsOn: ['type'] },
		displayOptions: forTypes('ai_slideshow', 'reddit_stories', 'would_you_rather', 'pick_one', 'fake_text'),
		default: '',
		description:
			'Background track. Leave empty for the type default. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
	},
	{
		displayName: 'Format',
		name: 'format',
		type: 'options',
		displayOptions: forTypes('ai_slideshow', 'would_you_rather', 'pick_one', 'fake_text', 'ai_video', 'yt_clips'),
		options: FORMAT_OPTIONS,
		default: '9:16',
	},
	{
		displayName: 'Extra Input (JSON)',
		name: 'extraInput',
		type: 'json',
		displayOptions: { show: create },
		default: '{}',
		description:
			'Any other input field of this type, for example {"voice": "pNInz6obpgDQGcFmaJgB", "captionStyle": "YouTuber"}. Merged over the fields above. Every field is listed at https://www.autofeed.ai/docs/api.',
	},
	{
		displayName: 'Webhook URL',
		name: 'webhookUrl',
		type: 'string',
		displayOptions: { show: create },
		default: '',
		placeholder: '={{ $execution.resumeUrl }}',
		description:
			'Optional public https:// URL that receives the finished video. Paste the production URL of an AutoFeed Trigger node, or use {{ $execution.resumeUrl }} with a Wait node set to resume on webhook call.',
	},
	{
		displayName: 'Idempotency Key',
		name: 'idempotencyKey',
		type: 'string',
		displayOptions: { show: create },
		default: '',
		placeholder: 'sheet-row-42',
		description:
			'Optional. A retry with the same key and the same request returns the original video and charges nothing, so set it to something unique per video, like a sheet row ID.',
	},
	{
		displayName: 'Wait for Completion',
		name: 'waitForCompletion',
		type: 'boolean',
		displayOptions: { show: create },
		default: false,
		description:
			'Whether to keep checking until the video is completed or failed and output the final result. Simple, but holds the execution open; for long renders a webhook is better.',
	},
	{
		displayName: 'Check Every (Seconds)',
		name: 'pollInterval',
		type: 'number',
		typeOptions: { minValue: 5, maxValue: 300 },
		displayOptions: { show: { ...create, waitForCompletion: [true] } },
		default: 15,
	},
	{
		displayName: 'Give Up After (Minutes)',
		name: 'pollTimeout',
		type: 'number',
		typeOptions: { minValue: 1, maxValue: 120 },
		displayOptions: { show: { ...create, waitForCompletion: [true] } },
		default: 30,
		description:
			'The video keeps rendering after this. The output then has status "processing"; read it later with Get.',
	},

	// ---------- get ----------
	{
		displayName: 'Video ID',
		name: 'videoId',
		type: 'string',
		required: true,
		displayOptions: { show: { resource: ['video'], operation: ['get'] } },
		default: '',
		placeholder: '6f1c2a54-8a0e-4d0b-9f0e-2a4b3c5d6e7f',
		description: 'The ID returned by the Create operation',
	},

	// ---------- getAll ----------
	{
		displayName: 'Return All',
		name: 'returnAll',
		type: 'boolean',
		displayOptions: { show: { resource: ['video'], operation: ['getAll'] } },
		default: false,
		description: 'Whether to return all results or only up to a given limit',
	},
	{
		displayName: 'Limit',
		name: 'limit',
		type: 'number',
		typeOptions: { minValue: 1 },
		displayOptions: { show: { resource: ['video'], operation: ['getAll'], returnAll: [false] } },
		default: 50,
		description: 'Max number of results to return',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		displayOptions: { show: { resource: ['video'], operation: ['getAll'] } },
		default: {},
		options: [
			{
				displayName: 'Status',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Completed', value: 'completed' },
					{ name: 'Failed', value: 'failed' },
					{ name: 'Processing', value: 'processing' },
				],
				default: 'completed',
			},
			{
				displayName: 'Video Type',
				name: 'type',
				type: 'options',
				options: VIDEO_TYPES.map(({ name, value }) => ({ name, value })),
				default: 'ai_slideshow',
			},
		],
	},
];
