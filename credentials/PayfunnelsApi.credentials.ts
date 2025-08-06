import type {
	ICredentialType,
	ICredentialTestRequest,
	IAuthenticateGeneric,
	INodeProperties,
	Icon,
} from 'n8n-workflow';

const serverURL = 'https://api.payfunnels.com/n8n-integration';

export class PayfunnelsApi implements ICredentialType {
	name = 'payfunnelsApi';
	displayName = 'Payfunnels API';
	documentationUrl = 'https://api.payfunnels.com/api/docs';
	icon = 'file:payfunnels.svg' as Icon;

	properties: INodeProperties[] = [
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'Enter your ID',
			hint: 'You can find the ID from the Billings -> Integrations -> n8n from the payfunnels dashboard.',
		},
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
			required: true,
			placeholder: 'Enter your API key',
			hint: 'You can find the API key from the Billings -> Integrations -> n8n from the payfunnels dashboard.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			body: {
				id: '={{$credentials.id}}',
				apiKey: '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			method: 'POST',
			baseURL: serverURL,
			url: '/authenticate',
			json: true,
			body: {
				id: '={{$credentials.id}}',
				apiKey: '={{$credentials.apiKey}}',
			},
		},
	};
}
