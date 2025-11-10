import {
	IHookFunctions,
	IWebhookFunctions,
	IDataObject,
	INodeType,
	INodeTypeDescription,
	IWebhookResponseData,
	NodeOperationError,
	NodeConnectionType,
} from 'n8n-workflow';

const serverURL = 'https://api.payfunnels.com/n8n-integration';

export class PayfunnelsTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Payfunnels Trigger',
		name: 'payfunnelsTrigger',
		icon: 'file:payfunnels.svg',
		group: ['trigger'],
		version: 1,
		description: 'Starts the workflow when Payfunnels events occur',
		defaults: {
			name: 'Payfunnels Trigger',
		},
		inputs: [],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'payfunnelsApi',
				required: true,
			},
		],
		webhooks: [
			{
				name: 'default',
				httpMethod: 'POST',
				responseMode: 'onReceived',
				path: 'payfunnels-webhook',
			},
		],
		properties: [
			{
				displayName: 'Event',
				name: 'event',
				type: 'options',
				options: [
					{
						name: 'First Recurring Payment',
						value: 'first_recurring_payment',
						description: 'Trigger when a first recurring payment is made',
					},
					{
						name: 'New Customer Created',
						value: 'new_customer',
						description: 'Trigger when a new customer is created',
					},
					{
						name: 'One Time Setup Fees Created',
						value: 'setupfees_created',
						description: 'Triggers when a new one time setup fees is created',
					},
					{
						name: 'One Time Setup Fees Deleted',
						value: 'setupfees_deleted',
						description: 'Triggers when one time setup fees is deleted',
					},
					{
						name: 'One Time Setup Fees Updated',
						value: 'setupfees_updated',
						description: 'Triggers when a one time setup fees is updated',
					},
					{
						name: 'Payment Failed',
						value: 'payment_failed',
						description: 'Trigger when a payment fails',
					},
					{
						name: 'Payment Link Created',
						value: 'invoice_created',
						description: 'Trigger when a payment link is created',
					},
					{
						name: 'Payment Link Deleted',
						value: 'invoice_deleted',
						description: 'Trigger when a payment link is deleted',
					},
					{
						name: 'Payment Link Updated',
						value: 'invoice_updated',
						description: 'Trigger when a payment link is updated',
					},
					{
						name: 'Payment Succeeded',
						value: 'payment_successful',
						description: 'Trigger when a payment is successful',
					},
				],
				default: 'payment_successful',
			},
		],
	};

	webhookMethods = {
		default: {
			async checkExists(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (webhookData.webhookId === undefined) {
					return false;
				}

				const credentials = await this.getCredentials('payfunnelsApi');

				try {
					const response = await this.helpers.httpRequest({
						method: 'GET',
						url: `${serverURL}/subscription/${webhookData.webhookId}`,
						headers: {
							Authorization: credentials.id as string,
						},
						json: true,
					});

					if (
						!response ||
						(response.webhook_id !== webhookData.webhookId && response.id !== webhookData.webhookId)
					) {
						return false;
					}
				} catch (error) {
					return false;
				}

				return true;
			},

			async create(this: IHookFunctions): Promise<boolean> {
				const webhookUrl = this.getNodeWebhookUrl('default');
				const event = this.getNodeParameter('event') as string;
				const credentials = await this.getCredentials('payfunnelsApi');

				let endpoint = `${serverURL}/subscribe`;
				let eventName = event;

				const body = {
					url: webhookUrl,
					event: eventName,
				};

				let responseData: IDataObject;
				try {
					responseData = await this.helpers.httpRequest({
						method: 'POST',
						url: endpoint,
						body,
						headers: {
							Authorization: credentials.id as string,
							'Content-Type': 'application/json',
						},
						json: true,
					});
				} catch (error) {
					throw new NodeOperationError(
						this.getNode(),
						`Payfunnels webhook creation failed: ${error}`,
					);
				}

				if (responseData.webhook_id === undefined && responseData.id === undefined) {
					throw new NodeOperationError(
						this.getNode(),
						'Payfunnels webhook creation failed: no webhook ID returned',
					);
				}

				const webhookData = this.getWorkflowStaticData('node');
				webhookData.webhookId = responseData.webhook_id || responseData.id;
				webhookData.event = event;

				return true;
			},

			async delete(this: IHookFunctions): Promise<boolean> {
				const webhookData = this.getWorkflowStaticData('node');
				if (webhookData.webhookId !== undefined) {
					const credentials = await this.getCredentials('payfunnelsApi');

					try {
						await this.helpers.httpRequest({
							method: 'DELETE',
							url: `${serverURL}/unsubscribe`,
							body: {
								id: webhookData.webhookId,
							},
							headers: {
								Authorization: credentials.id as string,
								'Content-Type': 'application/json',
							},
							json: true,
						});
					} catch (error) {
						return false;
					}

					delete webhookData.webhookId;
					delete webhookData.event;
				}

				return true;
			},
		},
	};

	async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
		const bodyData = this.getBodyData();

		return {
			workflowData: [this.helpers.returnJsonArray(bodyData)],
		};
	}
}
