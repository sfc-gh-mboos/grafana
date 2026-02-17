import { config, getBackendSrv } from '@grafana/runtime';
import { useCreateServiceAccountMutation, useUpdateServiceAccountMutation } from 'app/api/clients/legacy';
import { contextSrv } from 'app/core/services/context_srv';
import { ServiceAccountCreateApiResponse, ServiceAccountDTO } from 'app/types/serviceaccount';

const toServiceAccountForm = (serviceAccount: ServiceAccountDTO) => ({
  isDisabled: serviceAccount.isDisabled,
  name: serviceAccount.name,
  role: serviceAccount.role,
});

const toCreateResponse = (serviceAccount: {
  avatarUrl?: string;
  id?: number;
  isDisabled?: boolean;
  login?: string;
  name?: string;
  orgId?: number;
  role?: ServiceAccountCreateApiResponse['role'];
  tokens?: number;
  uid?: string;
}): ServiceAccountCreateApiResponse => {
  if (serviceAccount.id === undefined || serviceAccount.uid === undefined || serviceAccount.orgId === undefined) {
    throw new Error('Service account response is missing required fields');
  }

  return {
    avatarUrl: serviceAccount.avatarUrl,
    id: serviceAccount.id,
    isDisabled: serviceAccount.isDisabled ?? false,
    login: serviceAccount.login ?? '',
    name: serviceAccount.name ?? '',
    orgId: serviceAccount.orgId,
    role: serviceAccount.role ?? 'Viewer',
    tokens: serviceAccount.tokens ?? 0,
    uid: serviceAccount.uid,
  };
};

/**
 * Creates a service account and updates it with the selected form values.
 * The RTK Query path is gated behind the externalServiceAccounts feature flag.
 */
export const useCreateServiceAccount = () => {
  const [createServiceAccount, response] = useCreateServiceAccountMutation();
  const [updateServiceAccount] = useUpdateServiceAccountMutation();

  const trigger = async (serviceAccount: ServiceAccountDTO): Promise<ServiceAccountCreateApiResponse> => {
    if (!config.featureToggles.externalServiceAccounts) {
      const createdServiceAccount = await getBackendSrv().post<ServiceAccountCreateApiResponse>(
        '/api/serviceaccounts/',
        serviceAccount
      );

      await contextSrv.fetchUserPermissions();
      await getBackendSrv().patch(`/api/serviceaccounts/${createdServiceAccount.uid}`, serviceAccount);
      return createdServiceAccount;
    }

    const createResult = await createServiceAccount({
      createServiceAccountForm: toServiceAccountForm(serviceAccount),
    });

    if (createResult.error || !createResult.data) {
      throw createResult.error ?? new Error('Failed to create service account');
    }

    const createdServiceAccount = toCreateResponse(createResult.data);
    await contextSrv.fetchUserPermissions();

    const updateResult = await updateServiceAccount({
      serviceAccountId: createdServiceAccount.id,
      updateServiceAccountForm: toServiceAccountForm(serviceAccount),
    });

    if (updateResult.error) {
      throw updateResult.error;
    }

    return createdServiceAccount;
  };

  return [trigger, response] as const;
};
