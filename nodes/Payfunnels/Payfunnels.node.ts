import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
	NodeConnectionType,
} from 'n8n-workflow';

const serverURL = 'https://api.payfunnels.com/n8n-integration';

export class Payfunnels implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Payfunnels',
		name: 'payfunnels',
		icon: 'file:payfunnels.svg',
		group: ['transform'],
		version: 1,
		description: 'Payfunnels',
		defaults: {
			name: 'Payfunnels',
		},
		inputs: [NodeConnectionType.Main],
		outputs: [NodeConnectionType.Main],
		credentials: [
			{
				name: 'payfunnelsApi',
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
					{
						name: 'Payment',
						value: 'payment',
					},
					{
						name: 'Subscription',
						value: 'subscription',
					},
					{
						name: 'One Time Setup Fee',
						value: 'oneTimeSetupFees'
					}
				],
				default: 'payment',
			},

			// ----------------------------------
			//         Payment Operations - List payments and refund payment
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['payment'],
					},
				},
				options: [
					{
						name: 'List',
						value: 'list',
						description: 'List payments',
						action: 'List payments',
					},
					{
						name: 'Refund',
						value: 'refund',
						description: 'Refund a payment',
						action: 'Refund payment',
					},
				],
				default: 'list',
			},

			// ----------------------------------
			//         Subscription Operations - List subscriptions and cancel subscription
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['subscription'],
					},
				},
				options: [
					{
						name: 'List',
						value: 'list',
						description: 'List subscriptions',
						action: 'List subscriptions',
					},
					{
						name: 'Cancel',
						value: 'cancel',
						description: 'Cancel a subscription',
						action: 'Cancel subscription',
					},
				],
				default: 'list',
			},

			// ----------------------------------
			//         One time setup fees Operations - List one time setup fees
			// ----------------------------------
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['oneTimeSetupFees'],
					},
				},
				options: [
					{
						name: 'List',
						value: 'list',
						description:
							'Retrieves a list of one time setup fees based on filters like page and limit',
						action: 'List one time setup fees',
					},
				],
				default: 'list',
			},

			// ----------------------------------
			//         Payment Fields - Refund payment
			// ----------------------------------

			{
				displayName: 'Payment ID',
				name: 'id',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['payment'],
						operation: ['refund'],
					},
				},
				default: '',
				description: 'The ID of the payment to refund',
			},
			{
				displayName: 'Amount',
				name: 'amount',
				type: 'number',
				required: true,
				displayOptions: {
					show: {
						resource: ['payment'],
						operation: ['refund'],
					},
				},
				default: 0,
				description: 'Amount to refund',
			},
			{
				displayName: 'Reason',
				name: 'reason',
				type: 'options',
				required: true,
				options: [
					{ name: 'Duplicate', value: 'duplicate' },
					{ name: 'Fraudulent', value: 'fraudulent' },
					{ name: 'Requested By Customer', value: 'requested_by_customer' },
				],
				displayOptions: {
					show: {
						resource: ['payment'],
						operation: ['refund'],
					},
				},
				default: 'requested_by_customer',
			},

			// ----------------------------------
			//         Subscription Fields - Cancel subscription
			// ----------------------------------
			{
				displayName: 'Subscription ID',
				name: 'subscriptionId',
				type: 'string',
				required: true,
				displayOptions: {
					show: {
						resource: ['subscription'],
						operation: ['cancel'],
					},
				},
				default: '',
			},
			{
				displayName: 'Cancellation Option',
				name: 'cancellationOption',
				type: 'options',
				required: true,
				displayOptions: {
					show: {
						resource: ['subscription'],
						operation: ['cancel'],
					},
				},
				options: [
					{ name: 'Immediate', value: 'immediate' },
					{ name: 'End Of The Period', value: 'end_of_the_period' },
					{ name: 'Custom Date', value: 'custom_date' },
				],
				default: 'immediate',
			},
			{
				displayName: 'Cancel Date',
				name: 'cancelDate',
				type: 'dateTime',
				required: true,
				displayOptions: {
					show: {
						resource: ['subscription'],
						operation: ['cancel'],
						cancellationOption: ['custom_date'],
					},
				},
				default: '',
			},

			// ----------------------------------
			//         Additional Options - List payments and subscriptions
			// ----------------------------------
			{
				displayName: 'Limit',
				name: 'limit',
				type: 'number',
				default: 50,
				typeOptions: {
					minValue: 1,
				},
				displayOptions: {
					show: {
						resource: ['payment', 'subscription', 'oneTimeSetupFees'],
						operation: ['list'],
					},
				},
				description: 'Max number of results to return',
			},
			{
				displayName: 'Page',
				name: 'page',
				type: 'number',
				default: 1,
				typeOptions: {
					minValue: 1,
				},
				displayOptions: {
					show: {
						resource: ['payment', 'subscription', 'oneTimeSetupFees'],
						operation: ['list'],
					},
				},
				description: 'Page number',
			},
			{
				displayName: 'Email',
				name: 'search',
				type: 'string',
				default: '',
				displayOptions: {
					show: {
						resource: ['payment', 'subscription'],
						operation: ['list'],
					},
				},
				description: 'Search by customer email',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = await this.getCredentials('payfunnelsApi');

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i);
				const operation = this.getNodeParameter('operation', i);
				let responseData: any;

				if (resource === 'payment') {
					if (operation === 'list') {
						const limit = this.getNodeParameter('limit', i) as number;
						const page = this.getNodeParameter('page', i) as number;
						const search = this.getNodeParameter('search', i) as string;

						const qs: any = { limit, page };
						if (search) qs.search = search;

						responseData = await this.helpers.httpRequest({
							method: 'GET',
							url: `${serverURL}/payments`,
							headers: {
								Authorization: credentials.id as string,
								'Content-Type': 'application/json',
							},
							qs,
							json: true,
						});
					} else if (operation === 'refund') {
						const id = this.getNodeParameter('id', i) as string;
						const amount = this.getNodeParameter('amount', i) as number;
						const reason = this.getNodeParameter('reason', i) as string;

						responseData = await this.helpers.httpRequest({
							method: 'POST',
							url: `${serverURL}/payments/refund`,
							headers: {
								Authorization: credentials.id as string,
								'Content-Type': 'application/json',
							},
							body: {
								id,
								amount,
								reason,
							},
							json: true,
						});
					}
				} else if (resource === 'subscription') {
					if (operation === 'list') {
						const limit = this.getNodeParameter('limit', i) as number;
						const page = this.getNodeParameter('page', i) as number;
						const search = this.getNodeParameter('search', i) as string;

						const qs: any = { limit, page };
						if (search) qs.search = search;

						responseData = await this.helpers.httpRequest({
							method: 'GET',
							url: `${serverURL}/subscriptions`,
							headers: {
								Authorization: credentials.id as string,
								'Content-Type': 'application/json',
							},
							qs,
							json: true,
						});
					} else if (operation === 'cancel') {
						const subscriptionId = this.getNodeParameter('subscriptionId', i) as string;
						const cancellationOption = this.getNodeParameter('cancellationOption', i) as string;

						const body: any = {
							id: subscriptionId,
							cancellationOption,
						};

						if (cancellationOption === 'custom_date') {
							const cancelDate = this.getNodeParameter('cancelDate', i) as string;
							const cancelDateUnix = Math.floor(new Date(cancelDate).getTime() / 1000);
							body.cancelDate = cancelDateUnix;
						}

						responseData = await this.helpers.httpRequest({
							method: 'POST',
							url: `${serverURL}/subscriptions/cancel`,
							headers: {
								Authorization: credentials.id as string,
								'Content-Type': 'application/json',
							},
							body,
							json: true,
						});
					}
				} else if (resource === 'oneTimeSetupFees') {
					if (operation === 'list') {
						const limit = this.getNodeParameter('limit', i) as number;
						const page = this.getNodeParameter('page', i) as number;

						const qs: any = { limit, page };

						responseData = await this.helpers.httpRequest({
							method: 'GET',
							url: `${serverURL}/setupfees`,
							headers: {
								Authorization: credentials.id as string,
								'Content-Type': 'application/json',
							},
							qs,
							json: true,
						});
					}
				}

				if (Array.isArray(responseData)) {
					responseData.forEach((item) => returnData.push({ json: item, pairedItem: { item: i } }));
				} else {
					returnData.push({ json: responseData, pairedItem: { item: i } });
				}
			} catch (error: any) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: error.message },
						pairedItem: { item: i },
					});
					continue;
				}
				throw new NodeOperationError(this.getNode(), error.message, { itemIndex: i });
			}
		}

		return [returnData];
	}
}
