import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError, sleep } from 'n8n-workflow';

import {
	aiVideoModelOptions,
	autoFeedApiRequest,
	autoFeedApiRequestAllItems,
	enumOptions,
} from './GenericFunctions';
import { videoFields, videoOperations } from './VideoDescription';

/** Input fields each type reads from the node, beyond Extra Input. */
const TYPE_FIELDS: Record<string, string[]> = {
	ai_slideshow: ['category', 'topic', 'duration', 'language', 'substyle', 'music', 'format'],
	reddit_stories: ['subreddit', 'backgroundCategory', 'music'],
	would_you_rather: ['topic', 'numberOfComparisons', 'music', 'format'],
	pick_one: ['topic', 'numberOfImages', 'substyle', 'music', 'format'],
	fake_text: ['topic', 'numberOfMessages', 'theme', 'backgroundCategory', 'music', 'format'],
	ugc: ['hook', 'avatarSrc', 'demoSrc'],
	ai_video: ['model', 'mode', 'textPrompt', 'imageUrl', 'videoUrl', 'aiDuration', 'resolution', 'format'],
	ai_image: ['imageModel', 'prompt', 'ratio', 'quality'],
	yt_clips: ['youtubeUrl', 'clipCount', 'format'],
};

/** Node parameter name -> API input field name, where they differ. */
const RENAMED: Record<string, string> = { aiDuration: 'duration', imageModel: 'model' };

const TERMINAL = new Set(['completed', 'failed']);

export class AutoFeed implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AutoFeed',
		name: 'autoFeed',
		icon: { light: 'file:../../icons/autofeed.svg', dark: 'file:../../icons/autofeed.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Create faceless videos with the AutoFeed.ai Video API',
		defaults: {
			name: 'AutoFeed',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'autoFeedApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Account', value: 'account' },
					{ name: 'Video', value: 'video' },
					{ name: 'Video Type', value: 'videoType' },
				],
				default: 'video',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['account'] } },
				options: [
					{
						name: 'Get',
						value: 'get',
						action: 'Get the account',
						description: 'Credit balance, plan, rate limits and videos in flight',
					},
				],
				default: 'get',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: { show: { resource: ['videoType'] } },
				options: [
					{
						name: 'Get Many',
						value: 'getAll',
						action: 'Get many video types',
						description: 'Every video type with its price, example input and input schema',
					},
				],
				default: 'getAll',
			},
			...videoOperations,
			...videoFields,
		],
	};

	methods = {
		loadOptions: {
			async getSlideshowCategories(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return enumOptions.call(this, 'ai_slideshow', 'category');
			},
			async getLanguages(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return enumOptions.call(this, 'ai_slideshow', 'language');
			},
			async getUgcAvatars(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				return enumOptions.call(this, 'ugc', 'avatarSrc');
			},
			async getMusic(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const type = this.getCurrentNodeParameter('type') as string;
				const tracks = await enumOptions.call(this, type, 'music');
				return [{ name: 'Type Default', value: '' }, ...tracks];
			},
			getAiVideoModels: aiVideoModelOptions,
			async getAiVideoDurations(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const model = await currentAiModel.call(this);
				return ((model?.durations as number[]) ?? []).map((seconds) => ({
					name: `${seconds} Seconds`,
					value: seconds,
				}));
			},
			async getAiImageModels(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const types = await autoFeedApiRequest.call(this, 'GET', '/types');
				return ((types.aiImageModels as IDataObject[]) ?? []).map((model) => ({
					name: `${model.name} (${model.maker})`,
					value: String(model.model),
					description: String(model.description ?? ''),
				}));
			},
			async getAiImageRatios(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const model = await currentAiImageModel.call(this);
				return [
					{ name: 'Model Default', value: '' },
					...((model?.ratios as string[]) ?? []).map((ratio) => ({ name: ratio, value: ratio })),
				];
			},
			async getAiImageQualities(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const model = await currentAiImageModel.call(this);
				return [
					{ name: 'Model Default', value: '' },
					...((model?.qualities as IDataObject[]) ?? []).map((q) => ({
						name: `${q.label} (${q.credits} credits)`,
						value: String(q.quality),
					})),
				];
			},
			async getAiVideoResolutions(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const model = await currentAiModel.call(this);
				return ((model?.resolutions as string[]) ?? []).map((resolution) => ({
					name: resolution,
					value: resolution,
				}));
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		for (let i = 0; i < items.length; i++) {
			try {
				let result: IDataObject | IDataObject[];

				if (resource === 'account' && operation === 'get') {
					result = await autoFeedApiRequest.call(this, 'GET', '/me');
				} else if (resource === 'videoType' && operation === 'getAll') {
					const types = await autoFeedApiRequest.call(this, 'GET', '/types');
					result = (types.data as IDataObject[]) ?? [];
				} else if (resource === 'video' && operation === 'create') {
					result = await createVideo.call(this, i);
				} else if (resource === 'video' && operation === 'get') {
					const id = (this.getNodeParameter('videoId', i) as string).trim();
					result = await autoFeedApiRequest.call(this, 'GET', `/videos/${encodeURIComponent(id)}`);
				} else if (resource === 'video' && operation === 'getAll') {
					const returnAll = this.getNodeParameter('returnAll', i) as boolean;
					const filters = this.getNodeParameter('filters', i, {}) as IDataObject;
					const limit = returnAll ? undefined : (this.getNodeParameter('limit', i) as number);
					result = await autoFeedApiRequestAllItems.call(this, filters, limit);
				} else {
					throw new NodeOperationError(
						this.getNode(),
						`Unsupported operation "${operation}" for resource "${resource}"`,
						{ itemIndex: i },
					);
				}

				returnData.push(
					...this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray(result), {
						itemData: { item: i },
					}),
				);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
			}
		}

		return [returnData];
	}
}

async function currentAiModel(this: ILoadOptionsFunctions): Promise<IDataObject | undefined> {
	const name = this.getCurrentNodeParameter('model') as string | undefined;
	if (!name) return undefined;
	const types = await autoFeedApiRequest.call(this, 'GET', '/types');
	return ((types.aiVideoModels as IDataObject[]) ?? []).find((m) => m.model === name);
}

async function currentAiImageModel(this: ILoadOptionsFunctions): Promise<IDataObject | undefined> {
	const id = this.getCurrentNodeParameter('imageModel') as string | undefined;
	if (!id) return undefined;
	const types = await autoFeedApiRequest.call(this, 'GET', '/types');
	return ((types.aiImageModels as IDataObject[]) ?? []).find((m) => m.model === id);
}

async function createVideo(this: IExecuteFunctions, i: number): Promise<IDataObject> {
	const type = this.getNodeParameter('type', i) as string;
	const input: IDataObject = {};

	for (const name of TYPE_FIELDS[type] ?? []) {
		const value = this.getNodeParameter(name, i, undefined) as unknown;
		// Empty strings mean "use the API default"; the API is strict and would
		// reject an empty category or imageUrl.
		if (value === undefined || value === null || value === '') continue;
		input[RENAMED[name] ?? name] = value as IDataObject[string];
	}
	if (type === 'ai_video') {
		if (input.mode !== 'image_to_video') delete input.imageUrl;
		if (input.mode !== 'extend_video') delete input.videoUrl;
		// Extend follows the source video's shape; the API rejects a format.
		if (input.mode === 'extend_video') delete input.format;
		if (input.duration !== undefined) input.duration = Number(input.duration);
	}

	Object.assign(input, parseExtraInput.call(this, i));

	const body: IDataObject = { type, input };
	const webhookUrl = (this.getNodeParameter('webhookUrl', i, '') as string).trim();
	if (webhookUrl) body.webhookUrl = webhookUrl;
	const idempotencyKey = String(this.getNodeParameter('idempotencyKey', i, '') ?? '').trim();
	if (idempotencyKey) body.idempotencyKey = idempotencyKey;

	const accepted = await autoFeedApiRequest.call(this, 'POST', '/videos', body);

	if (!(this.getNodeParameter('waitForCompletion', i, false) as boolean)) return accepted;

	const intervalMs = (this.getNodeParameter('pollInterval', i, 15) as number) * 1000;
	const deadline = Date.now() + (this.getNodeParameter('pollTimeout', i, 30) as number) * 60_000;
	const path = `/videos/${encodeURIComponent(String(accepted.id))}`;

	let latest: IDataObject = accepted;
	while (Date.now() < deadline) {
		await sleep(Math.min(intervalMs, Math.max(0, deadline - Date.now())));
		latest = await autoFeedApiRequest.call(this, 'GET', path);
		if (TERMINAL.has(String(latest.status))) return latest;
	}
	return latest;
}

function parseExtraInput(this: IExecuteFunctions, i: number): IDataObject {
	const raw = this.getNodeParameter('extraInput', i, '{}') as unknown;
	if (raw === undefined || raw === null || raw === '') return {};
	let parsed: unknown = raw;
	if (typeof raw === 'string') {
		try {
			parsed = JSON.parse(raw);
		} catch {
			throw new NodeOperationError(this.getNode(), 'Extra Input (JSON) is not valid JSON', {
				itemIndex: i,
			});
		}
	}
	if (typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new NodeOperationError(this.getNode(), 'Extra Input (JSON) must be a JSON object', {
			itemIndex: i,
		});
	}
	return parsed as IDataObject;
}
