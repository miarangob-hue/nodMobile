declare namespace NodeJS {
  type ProcessEnv = {
    EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?: string;
    EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?: string;
    EXPO_PUBLIC_MERCADOPAGO_ENABLED?: string;
    EXPO_PUBLIC_API_BASE_URL?: string;
    EXPO_PUBLIC_NOD_API_KEY?: string;
    EXPO_PUBLIC_NOD_PROVIDER_API_KEY?: string;
    EXPO_PUBLIC_NOD_CUSTOMER_API_KEY?: string;
    EXPO_PUBLIC_NOD_CLIENT_API_KEY?: string;
    EXPO_PUBLIC_NOD_CUSTOMER_API_BASE_URL?: string;
    EXPO_PUBLIC_NOD_ADMIN_API_BASE_URL?: string;
    EXPO_PUBLIC_NOD_ADMIN_API_KEY?: string;
  };
}

declare const process: {
  env: NodeJS.ProcessEnv;
};
