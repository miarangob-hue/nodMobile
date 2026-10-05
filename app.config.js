const baseConfig = require("./app.json").expo;

module.exports = () => {
  const projectId = process.env.EAS_PROJECT_ID || process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  const googleServicesFile = process.env.GOOGLE_SERVICES_JSON;
  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

  const plugins = [...(baseConfig.plugins || [])];
  if (googleIosClientId && !plugins.some((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin) === "@react-native-google-signin/google-signin")) {
    const iosUrlScheme = googleIosClientId
      .replace(/\.apps\.googleusercontent\.com$/, "")
      .replace(/^/, "com.googleusercontent.apps.");
    plugins.push(["@react-native-google-signin/google-signin", { iosUrlScheme }]);
  }

  return {
    ...baseConfig,
    plugins,
    android: {
      ...baseConfig.android,
      ...(googleServicesFile ? { googleServicesFile } : {})
    },
    extra: {
      ...baseConfig.extra,
      ...(projectId ? { eas: { projectId } } : {})
    }
  };
};
