import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class AutoFeedApi implements ICredentialType {
	name = 'autoFeedApi';

	displayName = 'AutoFeed API';

	icon: Icon = { light: 'file:../icons/autofeed.svg', dark: 'file:../icons/autofeed.dark.svg' };

	documentationUrl = 'https://www.autofeed.ai/integrations/n8n';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			required: true,
			placeholder: 'af_live_...',
			description:
				'Create one at AutoFeed.ai, Dashboard > API Keys. The API is included with the Ultimate plan.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://www.autofeed.ai/api/v1',
			url: '/me',
			method: 'GET',
		},
	};
}
