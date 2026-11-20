import type {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IPollFunctions,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { autoFeedApiRequest } from '../AutoFeed/GenericFunctions';
import { VIDEO_TYPES } from '../AutoFeed/VideoDescription';

/**
 * Polls instead of registering a webhook: the AutoFeed API takes a webhook URL
 * per video (webhookUrl on create) and has no subscription endpoint, so there
 * is nothing for n8n to create or delete. Polling also works on a self-hosted
 * n8n that the internet cannot reach.
 *
 * GET /videos is ordered by creation time, not completion time, so a watermark
 * would miss an old video that finishes late. The trigger remembers the ids it
 * has already emitted instead.
 */

/** Ids remembered between polls. Comfortably more than two pages. */
const SEEN_IDS_KEPT = 500;

/** Pages of 50 read per poll. */
const PAGES_PER_POLL = 2;

export class AutoFeedTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'AutoFeed Trigger',
		name: 'autoFeedTrigger',
		icon: { light: 'file:../../icons/autofeed.svg', dark: 'file:../../icons/autofeed.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{"Video " + $parameter["status"]}}',
		description: 'Starts the workflow when an AutoFeed.ai video finishes',
		defaults: {
			name: 'AutoFeed Trigger',
		},
		polling: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'autoFeedApi',
				required: true,
			},
		],
		properties: [
			{
				displayName:
					'Checks AutoFeed on the schedule below. To continue a workflow the moment its own video finishes instead, pass {{ $execution.resumeUrl }} as the Webhook URL when you create the video and follow with a Wait node set to resume on webhook call.',
				name: 'notice',
				type: 'notice',
				default: '',
			},
			{
				displayName: 'Trigger On',
				name: 'status',
				type: 'options',
				options: [
					{ name: 'Video Completed', value: 'completed' },
					{
						name: 'Video Failed',
						value: 'failed',
						description: 'Failed videos are refunded in full automatically',
					},
				],
				default: 'completed',
			},
			{
				displayName: 'Video Type',
				name: 'type',
				type: 'options',
				options: [{ name: 'Any', value: '' }, ...VIDEO_TYPES.map(({ name, value }) => ({ name, value }))],
				default: '',
			},
		],
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const status = this.getNodeParameter('status') as string;
		const type = this.getNodeParameter('type', '') as string;
		const qs: IDataObject = { status, limit: 50 };
		if (type) qs.type = type;

		const videos: IDataObject[] = [];
		let cursor: string | undefined;
		for (let page = 0; page < PAGES_PER_POLL; page++) {
			const query: IDataObject = cursor ? { ...qs, cursor } : qs;
			const response = await autoFeedApiRequest.call(this, 'GET', '/videos', undefined, query);
			videos.push(...((response.data as IDataObject[]) ?? []));
			cursor = (response.nextCursor as string | null) ?? undefined;
			if (!cursor) break;
		}

		// A manual "Fetch Test Event" shows the newest match without touching state.
		if (this.getMode() === 'manual') {
			return videos.length ? [this.helpers.returnJsonArray(videos.slice(0, 1))] : null;
		}

		const staticData = this.getWorkflowStaticData('node');
		const stateKey = `${status}:${type}`;
		const firstPoll = staticData.stateKey !== stateKey || !Array.isArray(staticData.seenIds);
		const seen = new Set(firstPoll ? [] : (staticData.seenIds as string[]));

		const fresh = videos.filter((video) => !seen.has(String(video.id)));
		staticData.stateKey = stateKey;
		staticData.seenIds = [
			...new Set([...videos.map((video) => String(video.id)), ...seen]),
		].slice(0, SEEN_IDS_KEPT);

		// The first poll after activation only records what already exists, so
		// turning the workflow on does not replay every old video.
		if (firstPoll || fresh.length === 0) return null;
		return [this.helpers.returnJsonArray(fresh.reverse())];
	}
}
