import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	INodePropertyOptions,
	IPollFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

export const BASE_URL = 'https://www.autofeed.ai/api/v1';

type Context = IExecuteFunctions | ILoadOptionsFunctions | IPollFunctions;

/**
 * One authenticated call to the AutoFeed API. Errors come back as
 * `{ error: { code, message, details } }`. n8n already wraps a failed request
 * in a NodeApiError with that body in `context.data`, and wrapping it again
 * returns the same object with options ignored, so the API's own code and
 * message are written onto it here. Otherwise the user only sees n8n's
 * generic "Bad request - please check your parameters".
 */
export async function autoFeedApiRequest(
	this: Context,
	method: IHttpRequestMethods,
	path: string,
	body?: IDataObject,
	qs: IDataObject = {},
): Promise<IDataObject> {
	const options: IHttpRequestOptions = {
		method,
		url: `${BASE_URL}${path}`,
		qs,
		json: true,
		headers: { Accept: 'application/json' },
	};
	if (body !== undefined) options.body = body;

	try {
		return (await this.helpers.httpRequestWithAuthentication.call(
			this,
			'autoFeedApi',
			options,
		)) as IDataObject;
	} catch (error) {
		const apiError = new NodeApiError(this.getNode(), error as JsonObject);
		// Read the body from the original error too: when the node resolves its
		// own copy of n8n-workflow, `instanceof` fails and the re-wrap above
		// loses `context.data`.
		const data = (((error as JsonObject).context as IDataObject | undefined)?.data ??
			apiError.context?.data) as IDataObject | undefined;
		const body = data?.error as IDataObject | undefined;
		if (body && typeof body.message === 'string') {
			const details = Array.isArray(body.details)
				? (body.details as IDataObject[])
						.map((d) => (typeof d.message === 'string' ? d.message : ''))
						.filter(Boolean)
						.join('; ')
				: '';
			const text = details ? `${body.message} ${details}` : body.message;
			apiError.message = body.code ? `${String(body.code)}: ${text}` : text;
			apiError.description = undefined;
		}
		throw apiError;
	}
}

/** Follows nextCursor until the API runs out or `limit` items are collected. */
export async function autoFeedApiRequestAllItems(
	this: IExecuteFunctions,
	qs: IDataObject,
	limit?: number,
): Promise<IDataObject[]> {
	const results: IDataObject[] = [];
	let cursor: string | undefined;
	do {
		const query: IDataObject = { ...qs, limit: 50 };
		if (cursor) query.cursor = cursor;
		const page = await autoFeedApiRequest.call(this, 'GET', '/videos', undefined, query);
		results.push(...((page.data as IDataObject[]) ?? []));
		cursor = (page.nextCursor as string | null) ?? undefined;
	} while (cursor && (limit === undefined || results.length < limit));
	return limit === undefined ? results : results.slice(0, limit);
}

// ---------- dynamic dropdowns, read from GET /v1/types ----------

interface TypeEntry {
	type: string;
	inputSchema?: { properties?: Record<string, { enum?: unknown[] }> };
}

async function getTypes(this: ILoadOptionsFunctions): Promise<IDataObject> {
	return autoFeedApiRequest.call(this, 'GET', '/types');
}

/** The enum of one input field of one video type, as the live API defines it. */
export async function enumOptions(
	this: ILoadOptionsFunctions,
	type: string,
	field: string,
): Promise<INodePropertyOptions[]> {
	const types = await getTypes.call(this);
	const entry = ((types.data as unknown as TypeEntry[]) ?? []).find((t) => t.type === type);
	const values = entry?.inputSchema?.properties?.[field]?.enum ?? [];
	return values
		.filter((value): value is string => typeof value === 'string' && value !== '')
		.map((value) => ({ name: musicLabel(value), value }));
}

/** "/ugc-sounds/viral/bruno-mars-apt.mp3" reads better as "Viral: bruno mars apt". */
function musicLabel(value: string): string {
	const match = /^\/ugc-(?:sounds|templates)\/(?:([^/]+)\/)?([^/]+)\.(?:mp3|mp4)$/.exec(value);
	if (!match) return value;
	const name = match[2].replace(/-/g, ' ');
	return match[1] ? `${match[1][0].toUpperCase()}${match[1].slice(1)}: ${name}` : name;
}

export async function aiVideoModelOptions(
	this: ILoadOptionsFunctions,
): Promise<INodePropertyOptions[]> {
	const types = await getTypes.call(this);
	const models = (types.aiVideoModels as IDataObject[]) ?? [];
	return models.map((model) => {
		const modes = (model.modes as string[]).map((m) => m.replace(/_/g, ' ')).join(', ');
		const durations = (model.durations as number[]).join('/');
		const resolutions = (model.resolutions as string[]).join(', ');
		return {
			name: String(model.model),
			value: String(model.model),
			description: `${modes}. ${durations}s. ${resolutions}.`,
		};
	});
}
