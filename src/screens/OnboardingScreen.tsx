import { useCallback, useEffect, useMemo, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { BrandLogo } from "../components/BrandLogo";
import {
  getOnboardingSteps,
  getProviderOnboarding,
  getProviderRejections,
  submitProviderOnboarding
} from "../api/onboarding";
import {
  getBankAccountTypeOptions,
  getBankOptions,
  getServiceOptions,
  getServiceFamilyId,
  getServiceOptionsByFamily,
  type CatalogOption
} from "../api/catalog";
import { uploadFile } from "../api/files";
import { ApiError } from "../api/client";
import { clearSession, type Session } from "../storage/session";
import type { OnboardingField, OnboardingStep, Provider, ProviderRejectionsResponse } from "../types/api";

type Props = {
  provider: Provider;
  session: Session | null;
  onLogout: () => void;
  onSubmittedForReview: () => void;
};

type Answers = Record<string, string | string[] | boolean>;
type Option = {
  label: string;
  value: string;
};
type CatalogOptionsByType = {
  banks: CatalogOption[];
  bankAccountTypes: CatalogOption[];
  services: CatalogOption[];
};

export function OnboardingScreen({ provider, session, onLogout, onSubmittedForReview }: Props) {
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [catalogOptions, setCatalogOptions] = useState<CatalogOptionsByType>({
    banks: [],
    bankAccountTypes: [],
    services: []
  });
  const [progressByStep, setProgressByStep] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [rejectionMessage, setRejectionMessage] = useState<string | null>(null);
  const [isRejectionModalVisible, setIsRejectionModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const providerId = provider.id ?? session?.provider?.id;
  const accessToken = session?.access_token;
  const selectedServiceCategories = useMemo(() => {
    return getSelectedServiceCategories(answers, provider, steps, catalogOptions);
  }, [answers, catalogOptions, provider, steps]);
  const visibleSteps = useMemo(() => {
    return filterVisibleSteps(steps, selectedServiceCategories);
  }, [selectedServiceCategories, steps]);
  const currentStep = visibleSteps[currentIndex];
  const isLastStep = currentIndex === visibleSteps.length - 1;
  const completedCount = useMemo(() => {
    return visibleSteps.filter((step) => progressByStep[step.key] === "completed").length;
  }, [progressByStep, visibleSteps]);

  const sortedFields = useMemo(() => {
    return [...(currentStep?.fields ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  }, [currentStep]);

  const selectedBankId = useMemo(() => {
    const bankField = steps.flatMap((step) => step.fields).find(isBankField);
    const bankAnswer = bankField ? answers[bankField.key] : null;
    return typeof bankAnswer === "string" ? resolveCatalogValue(bankAnswer, catalogOptions.banks) : null;
  }, [answers, catalogOptions.banks, steps]);

  const loadOnboarding = useCallback(async () => {
    if (!providerId) {
      setError("No se encontro el proveedor asociado.");
      setIsLoading(false);
      return;
    }

    setError(null);
    setNotice(null);
    setIsLoading(true);

    try {
      const [stepsResponse, progressResponse, baseCatalogOptions, rejectionsResponse] = await Promise.all([
        getOnboardingSteps(undefined, accessToken),
        getProviderOnboarding(providerId, accessToken),
        loadBaseCatalogOptions(provider.service_categories),
        getProviderRejections(providerId, accessToken).catch((currentError) => {
          console.log("[NOD provider rejections fallback]", {
            message: getErrorMessage(currentError, "No se pudieron cargar los motivos de rechazo.")
          });
          return null;
        })
      ]);

      const orderedSteps = [...stepsResponse.steps].sort((a, b) => a.sort_order - b.sort_order);
      const statusMap = Object.fromEntries(progressResponse.steps.map((step) => [step.key, step.status]));
      const existingAnswers: Answers = {};
      const nextRejectionMessage =
        getRejectionMessageFromResponse(rejectionsResponse) ??
        getRejectionMessage(progressResponse.provider, progressResponse.steps);

      progressResponse.steps.forEach((step) => {
        step.responses.forEach((response) => {
          if (!response.field_key || response.value == null) {
            return;
          }

          if (typeof response.value === "string") {
            existingAnswers[response.field_key] = response.value;
          }

          if (Array.isArray(response.value)) {
            existingAnswers[response.field_key] = response.value.map(String);
          }

          if (typeof response.value === "boolean") {
            existingAnswers[response.field_key] = response.value;
          }
        });
      });

      setSteps(orderedSteps);
      setProgressByStep(statusMap);
      setAnswers(existingAnswers);
      setCatalogOptions((current) => ({ ...current, ...baseCatalogOptions }));
      setRejectionMessage(nextRejectionMessage);
      setIsRejectionModalVisible(Boolean(nextRejectionMessage));
    } catch (currentError) {
      setError(getErrorMessage(currentError, "No se pudo cargar el onboarding."));
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, provider.service_categories, providerId]);

  useEffect(() => {
    void loadOnboarding();
  }, [loadOnboarding]);

  useEffect(() => {
    setCurrentIndex((index) => Math.min(index, Math.max(visibleSteps.length - 1, 0)));
  }, [visibleSteps.length]);

  useEffect(() => {
    if (!selectedBankId) {
      setCatalogOptions((current) => ({ ...current, bankAccountTypes: [] }));
      return;
    }

    let shouldUpdate = true;
    const bankId = selectedBankId;

    async function loadAccountTypes() {
      try {
        const bankAccountTypes = await getBankAccountTypeOptions(bankId);

        if (shouldUpdate) {
          setCatalogOptions((current) => ({ ...current, bankAccountTypes }));
        }
      } catch (currentError) {
        console.log("[NOD catalog account types fallback]", {
          message: getErrorMessage(currentError, "No se pudieron cargar los tipos de cuenta.")
        });

        if (shouldUpdate) {
          setCatalogOptions((current) => ({ ...current, bankAccountTypes: [] }));
        }
      }
    }

    void loadAccountTypes();

    return () => {
      shouldUpdate = false;
    };
  }, [selectedBankId]);

  function updateAnswer(key: string, value: string | string[] | boolean) {
    setError(null);
    setNotice(null);
    setAnswers((current) => ({ ...current, [key]: value }));
  }

  async function saveCurrentStep(submitForReview = false) {
    if (!providerId || !currentStep) {
      return;
    }

    setError(null);
    setNotice(null);

    const missingField = sortedFields.find((field) => {
      const value = answers[field.key];
      return field.required && isEmptyAnswer(value);
    });

    if (missingField) {
      setError(`Completa el campo requerido: ${missingField.label}.`);
      return;
    }

    setIsSaving(true);

    try {
      const stepAnswers = await buildStepAnswers({
        answers,
        catalogOptions,
        fields: sortedFields,
        providerId,
        accessToken
      });

      const response = await submitProviderOnboarding(
        {
          provider_id: providerId,
          step_key: currentStep.key,
          answers: stepAnswers,
          status: "completed",
          submit_for_review: submitForReview
        },
        accessToken
      );

      setProgressByStep((current) => ({
        ...current,
        [currentStep.key]: response.status === "pending_review" ? "pending_review" : "completed"
      }));

      if (submitForReview) {
        onSubmittedForReview();
        return;
      }

      if (!submitForReview && currentIndex < visibleSteps.length - 1) {
        setCurrentIndex((index) => index + 1);
      }
    } catch (currentError) {
      console.warn("[NOD onboarding save failed]", {
        stepKey: currentStep.key,
        message: getErrorMessage(currentError, "No se pudo guardar este paso.")
      });
      setError(getErrorMessage(currentError, "No se pudo guardar este paso."));
    } finally {
      setIsSaving(false);
    }
  }

  async function handleLogout() {
    await clearSession();
    onLogout();
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#EE7C2B" />
      </View>
    );
  }

  if (!currentStep) {
    return (
      <View style={styles.centered}>
        <Text style={styles.emptyTitle}>Sin pasos configurados</Text>
        <Text style={styles.emptyText}>La API no retorno pasos de onboarding activos.</Text>
        <Pressable onPress={handleLogout} style={styles.secondaryButton}>
          <Text style={styles.secondaryText}>Cerrar sesion</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.topBar}>
          <View style={styles.providerBlock}>
            <BrandLogo size="small" />
            <View style={styles.providerCopy}>
              <Text style={styles.kicker}>Onboarding</Text>
              <Text numberOfLines={1} style={styles.providerName}>
                {provider.full_name ?? `${provider.first_name ?? ""} ${provider.last_name ?? ""}`.trim()}
              </Text>
            </View>
          </View>
          <Pressable onPress={handleLogout} style={styles.logoutButton}>
            <Feather color="#626D84" name="log-out" size={18} />
          </Pressable>
        </View>

        {rejectionMessage ? (
          <View style={styles.rejectionBanner}>
            <Feather color="#A32D2D" name="alert-triangle" size={18} />
            <View style={styles.rejectionBannerCopy}>
              <Text style={styles.rejectionBannerTitle}>Validacion rechazada</Text>
              <Text style={styles.rejectionBannerText}>{rejectionMessage}</Text>
            </View>
          </View>
        ) : null}

        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>
            Paso {currentIndex + 1} de {visibleSteps.length}
          </Text>
          <Text style={styles.progressMeta}>{completedCount} completados</Text>
        </View>

        <View style={styles.progressRow}>
          {visibleSteps.map((step, index) => (
            <View
              key={step.id}
              style={[
                styles.progressDot,
                index === currentIndex && styles.progressDotCurrent,
                progressByStep[step.key] === "completed" && styles.progressDotDone,
                isRejectedStatus(progressByStep[step.key]) && styles.progressDotRejected
              ]}
            />
          ))}
        </View>

        <View style={styles.stepHeader}>
          <Text style={styles.title}>{currentStep.title}</Text>
          {currentStep.description ? <Text style={styles.description}>{currentStep.description}</Text> : null}
        </View>

        <View style={styles.form}>
          {sortedFields.map((field) => (
            <FieldInput
              catalogOptions={catalogOptions}
              field={field}
              key={field.id}
              onChange={(value) => updateAnswer(field.key, value)}
              selectedBankId={selectedBankId}
              value={answers[field.key]}
            />
          ))}
        </View>

        {error ? (
          <View style={styles.feedbackError}>
            <Feather color="#A32D2D" name="alert-circle" size={18} />
            <Text style={styles.error}>{error}</Text>
          </View>
        ) : null}
        {notice ? (
          <View style={styles.feedbackNotice}>
            <Feather color="#367D5F" name="check-circle" size={18} />
            <Text style={styles.notice}>{notice}</Text>
          </View>
        ) : null}

      </ScrollView>

      <View style={styles.actions}>
        <Pressable
          disabled={currentIndex === 0 || isSaving}
          onPress={() => setCurrentIndex((index) => Math.max(0, index - 1))}
          style={[styles.ghostButton, currentIndex === 0 && styles.disabledButton]}
        >
          <Feather color="#1D2330" name="arrow-left" size={18} />
          <Text style={styles.ghostText}>Anterior</Text>
        </Pressable>

        <Pressable
          disabled={isSaving}
          onPress={() => saveCurrentStep(isLastStep)}
          style={[styles.primaryButton, isSaving && styles.disabledButton]}
        >
          {isSaving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Text style={styles.primaryText}>
                {isLastStep ? "Enviar a verificacion" : "Continuar"}
              </Text>
              <Feather color="#ffffff" name={isLastStep ? "send" : "arrow-right"} size={18} />
            </>
          )}
        </Pressable>
      </View>

      <Modal
        animationType="fade"
        onRequestClose={() => setIsRejectionModalVisible(false)}
        transparent
        visible={isRejectionModalVisible}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.rejectionModal}>
            <View style={styles.rejectionModalIcon}>
              <Feather color="#A32D2D" name="alert-triangle" size={26} />
            </View>
            <Text style={styles.rejectionModalTitle}>Validacion rechazada</Text>
            <Text style={styles.rejectionModalText}>{rejectionMessage}</Text>
            <Pressable onPress={() => setIsRejectionModalVisible(false)} style={styles.rejectionModalButton}>
              <Text style={styles.rejectionModalButtonText}>Entendido, corregir datos</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

async function loadBaseCatalogOptions(serviceCategories: string[] | undefined) {
  const [banks, services] = await Promise.all([
    getBankOptions().catch((currentError) => {
      console.log("[NOD catalog banks fallback]", {
        message: getErrorMessage(currentError, "No se pudieron cargar los bancos.")
      });
      return [];
    }),
    loadServiceOptions(serviceCategories)
  ]);

  return { banks, services };
}

async function loadServiceOptions(serviceCategories: string[] | undefined) {
  const allServiceOptions = await getServiceOptions().catch((currentError) => {
    console.log("[NOD catalog services fallback]", {
      message: getErrorMessage(currentError, "No se pudieron cargar los servicios.")
    });
    return [];
  });

  if (allServiceOptions.length > 0) {
    return allServiceOptions;
  }

  const candidateIds = [...new Set(serviceCategories ?? [])].filter(isUuid);
  const resolvedFamilyIds = await Promise.all(
    candidateIds.map((candidateId) =>
      getServiceFamilyId(candidateId).catch(() => null)
    )
  );
  const familyIds = [...new Set([...candidateIds, ...resolvedFamilyIds].filter(isUuidValue))];

  if (familyIds.length === 0) {
    return [];
  }

  const results = await Promise.all(
    familyIds.map((familyId) =>
      getServiceOptionsByFamily(familyId).catch((currentError) => {
        console.log("[NOD catalog services fallback]", {
          familyId,
          message: getErrorMessage(currentError, "No se pudieron cargar los servicios.")
        });
        return [];
      })
    )
  );

  const optionsByValue = new Map<string, CatalogOption>();

  results.flat().forEach((option) => {
    optionsByValue.set(option.value, option);
  });

  return [...optionsByValue.values()];
}

async function buildStepAnswers({
  answers,
  catalogOptions,
  fields,
  providerId,
  accessToken
}: {
  answers: Answers;
  catalogOptions: CatalogOptionsByType;
  fields: OnboardingField[];
  providerId: string;
  accessToken?: string | null;
}) {
  const entries = await Promise.all(
    fields.map(async (field) => {
      const answer = answers[field.key] ?? "";

      if (field.field_type === "file" && typeof answer === "string" && isLocalFileUri(answer)) {
        console.log("[NOD upload-file]", {
          fieldKey: field.key,
          uriScheme: answer.split(":")[0]
        });

        const uploadedFile = await uploadFile({
          providerId,
          documentType: field.key,
          fileUri: answer,
          accessToken
        });

        console.log("[NOD upload-file ok]", {
          fieldKey: field.key,
          documentId: uploadedFile.document_id
        });

        return [field.key, uploadedFile.uri] as const;
      }

      return [field.key, answer] as const;
    })
  );

  return Object.fromEntries(
    entries.map(([key, value]) => {
      const field = fields.find((currentField) => currentField.key === key);
      return [key, field ? resolveSubmitAnswer(field, value, catalogOptions) : value];
    })
  );
}

function resolveSubmitAnswer(
  field: OnboardingField,
  value: string | string[] | boolean,
  catalogOptions: CatalogOptionsByType
) {
  const catalogField = getCatalogField(field);

  if (!catalogField || field.field_type === "file") {
    return value;
  }

  if (isServiceCategoryField(field)) {
    const configuredOptions = getConfiguredFieldOptions(field);

    if (Array.isArray(value)) {
      return value.map((currentValue) =>
        getCategorySubmitValue(currentValue, configuredOptions, catalogOptions.services)
      );
    }

    if (typeof value === "string") {
      return getCategorySubmitValue(value, configuredOptions, catalogOptions.services);
    }

    return value;
  }

  const options = catalogOptions[catalogField];

  if (Array.isArray(value)) {
    return value.map((currentValue) => getSubmitValue(currentValue, options));
  }

  if (typeof value === "string") {
    return getSubmitValue(value, options);
  }

  return value;
}

function getSubmitValue(value: string, options: CatalogOption[]) {
  const option = options.find((currentOption) => currentOption.value === value);
  return option?.submitValue ?? option?.label ?? value;
}

function resolveCatalogValue(value: string, options: CatalogOption[]) {
  const option = options.find((currentOption) =>
    currentOption.value === value ||
    currentOption.label === value ||
    currentOption.submitValue === value
  );

  return option?.value ?? null;
}

function getCategorySubmitValue(value: string, options: Option[], serviceOptions: CatalogOption[]) {
  const matchedCatalogOption = serviceOptions.find((option) => option.value === value);
  const categoryCandidate = matchedCatalogOption?.label ?? value;
  const matchedOption = options.find((option) =>
    valuesMatch(option.value, categoryCandidate) || valuesMatch(option.label, categoryCandidate)
  );

  return matchedOption?.value ?? value;
}

function normalizeOptionValue(value: string, options: Option[], serviceOptions: CatalogOption[]) {
  if (options.some((option) => option.value === value)) {
    return value;
  }

  const matchedCatalogOption = serviceOptions.find((option) =>
    option.value === value || valuesMatch(option.label, value)
  );
  const optionCandidate = matchedCatalogOption?.label ?? value;
  const matchedOption = options.find((option) =>
    valuesMatch(option.value, optionCandidate) || valuesMatch(option.label, optionCandidate)
  );

  return matchedOption?.value ?? value;
}

function getSelectedServiceCategories(
  answers: Answers,
  provider: Provider,
  steps: OnboardingStep[],
  catalogOptions: CatalogOptionsByType
) {
  const categoryAnswer = answers.service_category ?? answers.service_categories;
  const selectedValues = Array.isArray(categoryAnswer)
    ? categoryAnswer
    : typeof categoryAnswer === "string" && categoryAnswer.trim()
      ? [categoryAnswer]
      : provider.service_categories ?? [];
  const categoryOptions = steps
    .flatMap((step) => step.fields)
    .filter(isServiceCategoryField)
    .flatMap(getConfiguredFieldOptions);

  const categoryValues = new Set<string>();

  selectedValues.forEach((selectedValue) => {
    categoryValues.add(selectedValue);

    const matchedCatalogOption = catalogOptions.services.find((option) =>
      option.value === selectedValue || valuesMatch(option.label, selectedValue)
    );
    const categoryCandidate = matchedCatalogOption?.label ?? selectedValue;
    const matchedOption = categoryOptions.find((option) =>
      valuesMatch(option.value, categoryCandidate) || valuesMatch(option.label, categoryCandidate)
    );

    if (matchedOption) {
      categoryValues.add(matchedOption.value);
    }
  });

  return [...categoryValues];
}

function filterVisibleSteps(steps: OnboardingStep[], selectedServiceCategories: string[]) {
  return steps.filter((step) => {
    if (step.applies_to !== "by_category" || step.service_categories.length === 0) {
      return true;
    }

    return step.service_categories.some((category) =>
      selectedServiceCategories.some((selectedCategory) => valuesMatch(category, selectedCategory))
    );
  });
}

function isEmptyAnswer(value: string | string[] | boolean | undefined) {
  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (typeof value === "boolean") {
    return false;
  }

  return !value || !value.trim();
}

function isLocalFileUri(value: string) {
  return value.startsWith("file://") || value.startsWith("content://");
}

function FieldInput({
  field,
  catalogOptions,
  selectedBankId,
  value,
  onChange
}: {
  field: OnboardingField;
  catalogOptions: CatalogOptionsByType;
  selectedBankId: string | null;
  value?: string | string[] | boolean;
  onChange: (value: string | string[] | boolean) => void;
}) {
  const [optionSearch, setOptionSearch] = useState("");
  const catalogField = getCatalogField(field);
  const options = getFieldOptions(field, catalogOptions);
  const fieldType = catalogField ? getCatalogFieldType(field, catalogField) : field.field_type;

  if (field.field_type === "comunas") {
    const comunaOptions = getComunaOptions(field);
    const selectedValues = Array.isArray(value) ? value : [];
    const filteredOptions = comunaOptions.filter((option) =>
      !optionSearch.trim() || normalizeFieldName(`${option.label} ${option.region}`).includes(normalizeFieldName(optionSearch))
    );

    return (
      <View style={styles.field}>
        <Text style={styles.label}>{field.label}{field.required ? " *" : ""}</Text>
        <TextInput
          autoCorrect={false}
          keyboardType={Platform.OS === "android" ? "visible-password" : "default"}
          onChangeText={setOptionSearch}
          placeholder="Buscar comuna o región"
          showSoftInputOnFocus
          style={styles.input}
          value={optionSearch}
        />
        {selectedValues.length > 0 ? (
          <View style={styles.selectedSummary}>
            <Text style={styles.selectedSummaryText}>{selectedValues.length} comuna{selectedValues.length === 1 ? "" : "s"} seleccionada{selectedValues.length === 1 ? "" : "s"}</Text>
            <View style={styles.optionWrap}>{selectedValues.map((comuna) => <Pressable key={comuna} onPress={() => onChange(selectedValues.filter((item) => item !== comuna))} style={[styles.optionChip, styles.optionChipSelected]}><Text style={styles.optionTextSelected}>{comuna} ×</Text></Pressable>)}</View>
          </View>
        ) : null}
        <ScrollView nestedScrollEnabled style={styles.comunaList}>
          {filteredOptions.map((option) => {
            const isSelected = selectedValues.includes(option.value);
            return <Pressable key={`${option.region}-${option.value}`} onPress={() => onChange(isSelected ? selectedValues.filter((item) => item !== option.value) : [...selectedValues, option.value])} style={[styles.comunaRow, isSelected && styles.comunaRowSelected]}><View style={styles.comunaCopy}><Text style={[styles.comunaName, isSelected && styles.comunaSelectedText]}>{option.label}</Text><Text style={[styles.comunaRegion, isSelected && styles.comunaSelectedText]}>{option.region}</Text></View>{isSelected ? <Feather color="#ffffff" name="check" size={17} /> : null}</Pressable>;
          })}
        </ScrollView>
        {field.help_text ? <Text style={styles.help}>{field.help_text}</Text> : null}
      </View>
    );
  }

  if (catalogField && options.length === 0) {
    const emptyText =
      catalogField === "bankAccountTypes" && !selectedBankId
        ? "Selecciona un banco primero."
        : catalogField === "bankAccountTypes"
          ? "No hay tipos de cuenta disponibles para este banco."
        : "No hay opciones disponibles desde el catalogo.";

    return (
      <View style={styles.field}>
        <Text style={styles.label}>
          {field.label}
          {field.required ? " *" : ""}
        </Text>
        <View style={styles.emptyCatalogBox}>
          <Text style={styles.emptyCatalogText}>{emptyText}</Text>
        </View>
        {field.help_text ? <Text style={styles.help}>{field.help_text}</Text> : null}
      </View>
    );
  }

  if (field.field_type === "file") {
    const imageUri = typeof value === "string" ? value : "";

    async function handleTakePhoto() {
      const permission = await ImagePicker.requestCameraPermissionsAsync();

      if (!permission.granted) {
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        mediaTypes: ["images"],
        quality: 0.8
      });

      if (!result.canceled) {
        onChange(result.assets[0]?.uri ?? "");
      }
    }

    return (
      <View style={styles.field}>
        <Text style={styles.label}>
          {field.label}
          {field.required ? " *" : ""}
        </Text>
        <View style={styles.fileDropzone}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.filePreview} />
          ) : (
            <View style={styles.filePlaceholder}>
              <Feather color="#EE7C2B" name="camera" size={24} />
              <Text style={styles.filePlaceholderTitle}>Sin archivo</Text>
            </View>
          )}
        </View>
        <Pressable onPress={handleTakePhoto} style={styles.fileButton}>
          <Feather color="#ffffff" name="camera" size={18} />
          <Text style={styles.fileButtonText}>{imageUri ? "Reemplazar foto" : "Tomar foto"}</Text>
        </Pressable>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType={Platform.OS === "android" ? "visible-password" : "default"}
          onChangeText={onChange}
          placeholder="URL o ID del documento"
          showSoftInputOnFocus
          style={styles.input}
          value={Array.isArray(value) ? value.join(", ") : typeof value === "string" ? value : ""}
        />
        {field.help_text ? <Text style={styles.help}>{field.help_text}</Text> : null}
      </View>
    );
  }

  if (field.field_type === "checkbox") {
    const isSelected = value === true;

    return (
      <View style={styles.field}>
        <Pressable
          onPress={() => onChange(!isSelected)}
          style={[styles.toggleRow, isSelected && styles.toggleRowSelected]}
        >
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected ? <Feather color="#ffffff" name="check" size={14} /> : null}
          </View>
          <View style={styles.toggleCopy}>
            <Text style={styles.label}>
              {field.label}
              {field.required ? " *" : ""}
            </Text>
            {field.help_text ? <Text style={styles.help}>{field.help_text}</Text> : null}
          </View>
        </Pressable>
      </View>
    );
  }

  if (fieldType === "select" && options.length > 0) {
    const selectedValue =
      typeof value === "string" ? normalizeOptionValue(value, options, catalogOptions.services) : value;

    return (
      <View style={styles.field}>
        <Text style={styles.label}>
          {field.label}
          {field.required ? " *" : ""}
        </Text>
        <View style={styles.optionWrap}>
          {options.map((option) => {
            const isSelected = selectedValue === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => onChange(option.value)}
                style={[styles.optionChip, isSelected && styles.optionChipSelected]}
              >
                {isSelected ? <Feather color="#ffffff" name="check" size={14} /> : null}
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {field.help_text ? <Text style={styles.help}>{field.help_text}</Text> : null}
      </View>
    );
  }

  if (fieldType === "multiselect" && options.length > 0) {
    const selectedValues = Array.isArray(value)
      ? value.map((currentValue) => normalizeOptionValue(currentValue, options, catalogOptions.services))
      : [];

    return (
      <View style={styles.field}>
        <Text style={styles.label}>
          {field.label}
          {field.required ? " *" : ""}
        </Text>
        <View style={styles.optionWrap}>
          {options.map((option) => {
            const isSelected = selectedValues.includes(option.value);
            return (
              <Pressable
                key={option.value}
                onPress={() => {
                  onChange(
                    isSelected
                      ? selectedValues.filter((current) => current !== option.value)
                      : [...selectedValues, option.value]
                  );
                }}
                style={[styles.optionChip, isSelected && styles.optionChipSelected]}
              >
                {isSelected ? <Feather color="#ffffff" name="check" size={14} /> : null}
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {field.help_text ? <Text style={styles.help}>{field.help_text}</Text> : null}
      </View>
    );
  }

  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {field.label}
        {field.required ? " *" : ""}
      </Text>
      <TextInput
        autoCorrect={false}
        keyboardType={getKeyboardType(field)}
        multiline={field.field_type === "textarea"}
        onChangeText={onChange}
        placeholder={field.help_text ?? field.label}
        showSoftInputOnFocus
        style={[styles.input, field.field_type === "textarea" && styles.textarea]}
        value={Array.isArray(value) ? value.join(", ") : typeof value === "string" ? value : ""}
      />
      {field.help_text ? <Text style={styles.help}>{field.help_text}</Text> : null}
    </View>
  );
}

function getFieldOptions(field: OnboardingField, catalogOptions?: CatalogOptionsByType): Option[] {
  const catalogField = getCatalogField(field);
  const configuredOptions = getConfiguredFieldOptions(field);

  if (catalogField === "services" && configuredOptions.length > 0) {
    return configuredOptions;
  }

  if (catalogOptions && catalogField) {
    const remoteOptions = catalogOptions[catalogField];
    return remoteOptions.length > 0 ? remoteOptions : configuredOptions;
  }

  return configuredOptions;
}

function getConfiguredFieldOptions(field: OnboardingField): Option[] {
  const fieldOptions = field.options as unknown;
  const rawOptions = Array.isArray(fieldOptions)
    ? fieldOptions
    : field.options?.options ?? field.options?.values ?? field.options?.items;

  if (Array.isArray(rawOptions)) {
    return rawOptions
      .map((option) => {
        if (typeof option === "string") {
          return { label: option, value: option };
        }

        if (option && typeof option === "object") {
          const record = option as Record<string, unknown>;
          const value = record.value ?? record.id ?? record.key ?? record.label;
          const label = record.label ?? record.name ?? value;

          if (value != null && label != null) {
            return { label: String(label), value: String(value) };
          }
        }

        return null;
      })
      .filter((option): option is Option => option != null);
  }

  if (field.options && typeof field.options === "object") {
    return Object.entries(field.options)
      .filter(([, label]) => typeof label === "string" || typeof label === "number")
      .map(([value, label]) => ({ label: String(label), value }));
  }

  return [];
}

function getComunaOptions(field: OnboardingField) {
  const rawOptions = field.options as unknown;
  if (!Array.isArray(rawOptions)) return [];

  return rawOptions.flatMap((group) => {
    if (!group || typeof group !== "object") return [];
    const record = group as { region?: unknown; comunas?: unknown };
    const region = String(record.region ?? "Chile");
    if (!Array.isArray(record.comunas)) return [];
    return record.comunas.map((comuna) => ({ label: String(comuna), value: String(comuna), region }));
  });
}

function getCatalogField(field: OnboardingField): keyof CatalogOptionsByType | null {
  const name = normalizeFieldName(`${field.key} ${field.label}`);

  if (isServiceCategoryField(field)) {
    return null;
  }

  if (
    (name.includes("tipo") || name.includes("type")) &&
    (name.includes("cuenta") || name.includes("account")) &&
    (name.includes("banc") || name.includes("bank"))
  ) {
    return "bankAccountTypes";
  }

  if (
    (name.includes("banco") || name.includes("bank")) &&
    !name.includes("cuenta") &&
    !name.includes("account")
  ) {
    return "banks";
  }

  if (name.includes("servicio") || name.includes("service")) {
    return "services";
  }

  return null;
}

function getCatalogFieldType(field: OnboardingField, catalogField: keyof CatalogOptionsByType) {
  if (field.field_type === "multiselect") {
    return "multiselect";
  }

  if (field.field_type === "select") {
    return "select";
  }

  if (catalogField === "services" && isPluralField(field)) {
    return "multiselect";
  }

  return "select";
}

function isBankField(field: OnboardingField) {
  return getCatalogField(field) === "banks";
}

function isServiceCategoryField(field: OnboardingField) {
  const name = normalizeFieldName(`${field.key} ${field.label}`);
  return name.includes("service_category") || name.includes("service_categories") || name.includes("categorias");
}

function isPluralField(field: OnboardingField) {
  const name = normalizeFieldName(`${field.key} ${field.label}`);
  return name.includes("servicios") || name.includes("services") || name.includes("categorias");
}

function normalizeFieldName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function valuesMatch(left: string, right: string) {
  return normalizeFieldName(left).includes(normalizeFieldName(right))
    || normalizeFieldName(right).includes(normalizeFieldName(left));
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isUuidValue(value: string | null): value is string {
  return typeof value === "string" && isUuid(value);
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return fallback;
}

function getRejectionMessageFromResponse(response: ProviderRejectionsResponse | null) {
  if (!response) {
    return null;
  }

  const messages = extractRejectionMessages(response);

  if (messages.length > 0) {
    return [...new Set(messages)].join("\n\n");
  }

  if (hasRejectedStatus(response)) {
    return "Tu validacion fue rechazada. Revisa los datos observados y vuelve a enviarlos para verificacion.";
  }

  return null;
}

function extractRejectionMessages(value: unknown): string[] {
  if (typeof value === "string") {
    return value.trim() ? [value.trim()] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap(extractRejectionMessages);
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const record = value as Record<string, unknown>;
  const message = getFirstText(record, [
    "reason",
    "message",
    "notes",
    "note",
    "comment",
    "comments",
    "description",
    "rejection_reason",
    "review_notes",
    "observations",
    "observation"
  ]);
  const scope = getFirstText(record, [
    "field_label",
    "field_key",
    "step_title",
    "step_key",
    "title",
    "label",
    "field"
  ]);
  const ownMessages = message ? [formatScopedRejection(scope, message)] : [];
  const childKeys = [
    "current_rejection",
    "rejection",
    "rejections",
    "reasons",
    "rejection_history",
    "review_history",
    "rejected_items",
    "items",
    "fields"
  ];
  const childMessages = childKeys.flatMap((key) => extractRejectionMessages(record[key]));

  return [...ownMessages, ...childMessages];
}

function formatScopedRejection(scope: string | null | undefined, message: string) {
  return isNonEmptyString(scope) ? `${scope}: ${message.trim()}` : message.trim();
}

function getFirstText(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];

    if (isNonEmptyString(value)) {
      return value.trim();
    }
  }

  return null;
}

function hasRejectedStatus(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(hasRejectedStatus);
  }

  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Record<string, unknown>;

  if (
    isRejectedStatus(String(record.status ?? "")) ||
    isRejectedStatus(String(record.action ?? "")) ||
    Boolean(record.current_rejection)
  ) {
    return true;
  }

  return [
    "rejection",
    "rejections",
    "reasons",
    "rejection_history",
    "review_history",
    "rejected_items",
    "items",
    "fields"
  ].some((key) => hasRejectedStatus(record[key]));
}

function getRejectionMessage(provider: Provider, steps: Array<{ title: string; status: string; notes?: string | null }>) {
  const providerNotes = [
    provider.rejection_reason,
    provider.review_notes,
    provider.onboarding_rejection_reason,
    provider.rejected_reason
  ].filter(isNonEmptyString);
  const stepNotes = steps
    .filter((step) => isRejectedStatus(step.status) || isNonEmptyString(step.notes))
    .map((step) => {
      const note = step.notes?.trim();
      return note ? `${step.title}: ${note}` : null;
    })
    .filter(isNonEmptyString);
  const messages = [...providerNotes, ...stepNotes];

  if (messages.length > 0) {
    return messages.join("\n\n");
  }

  if (isRejectedStatus(provider.status) || isRejectedStatus(provider.onboarding_step)) {
    return "Tu validacion fue rechazada. Revisa y corrige los datos marcados antes de volver a enviar.";
  }

  return null;
}

function isRejectedStatus(status: string | null | undefined) {
  return ["rejected", "rejection", "needs_changes", "changes_requested"].includes(
    String(status ?? "").toLowerCase()
  );
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function getKeyboardType(field: OnboardingField) {
  if (Platform.OS === "android") {
    return "visible-password";
  }

  if (field.field_type === "number") {
    return "numeric";
  }

  if (field.field_type === "email") {
    return "email-address";
  }

  if (field.field_type === "phone" || field.field_type === "tel") {
    return "phone-pad";
  }

  if (field.field_type === "url") {
    return "url";
  }

  return "default";
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: "#F1EFE8",
    flex: 1
  },
  container: {
    backgroundColor: "#F1EFE8",
    padding: 20,
    paddingBottom: 140,
    paddingTop: 52
  },
  centered: {
    alignItems: "center",
    backgroundColor: "#F1EFE8",
    flex: 1,
    justifyContent: "center",
    padding: 24
  },
  topBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20
  },
  providerBlock: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 12,
    minWidth: 0
  },
  logoMark: {
    height: 56,
    width: 39
  },
  providerCopy: {
    flex: 1,
    minWidth: 0
  },
  kicker: {
    color: "#EE7C2B",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase"
  },
  providerName: {
    color: "#1D2330",
    fontSize: 18,
    fontWeight: "800",
    marginTop: 4
  },
  logoutButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#E7E0DA",
    borderRadius: 12,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44
  },
  progressHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10
  },
  progressLabel: {
    color: "#1D2330",
    fontSize: 14,
    fontWeight: "800"
  },
  progressMeta: {
    color: "#626D84",
    fontSize: 13,
    fontWeight: "700"
  },
  progressRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 20
  },
  progressDot: {
    backgroundColor: "#E7E0DA",
    borderRadius: 999,
    flex: 1,
    height: 7
  },
  progressDotCurrent: {
    backgroundColor: "#EE7C2B"
  },
  progressDotDone: {
    backgroundColor: "#E37850"
  },
  progressDotRejected: {
    backgroundColor: "#A32D2D"
  },
  stepHeader: {
    backgroundColor: "#ffffff",
    borderColor: "#E7E0DA",
    borderRadius: 8,
    borderWidth: 1,
    padding: 18
  },
  title: {
    color: "#1D2330",
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 30
  },
  description: {
    color: "#626D84",
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8
  },
  form: {
    gap: 14,
    marginTop: 16
  },
  field: {
    backgroundColor: "#ffffff",
    borderColor: "#E7E0DA",
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 14
  },
  label: {
    color: "#1D2330",
    fontSize: 15,
    fontWeight: "700"
  },
  input: {
    backgroundColor: "#FCFAF7",
    borderColor: "#E7E0DA",
    borderRadius: 8,
    borderWidth: 1,
    color: "#1D2330",
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 14
  },
  textarea: {
    minHeight: 120,
    paddingTop: 14,
    textAlignVertical: "top"
  },
  help: {
    color: "#626D84",
    fontSize: 13
  },
  fileButton: {
    alignItems: "center",
    backgroundColor: "#EE7C2B",
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
    minHeight: 48,
    justifyContent: "center"
  },
  fileButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800"
  },
  filePreview: {
    borderRadius: 7,
    height: "100%",
    width: "100%"
  },
  fileDropzone: {
    backgroundColor: "#E6F1FB",
    borderColor: "#F5C4B3",
    borderRadius: 8,
    borderStyle: "dashed",
    borderWidth: 1,
    height: 180,
    overflow: "hidden"
  },
  filePlaceholder: {
    alignItems: "center",
    flex: 1,
    gap: 8,
    justifyContent: "center"
  },
  filePlaceholderTitle: {
    color: "#EE7C2B",
    fontSize: 14,
    fontWeight: "800"
  },
  optionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  optionChip: {
    alignItems: "center",
    backgroundColor: "#FCFAF7",
    borderColor: "#E7E0DA",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  optionChipSelected: {
    backgroundColor: "#EE7C2B",
    borderColor: "#EE7C2B"
  },
  optionText: {
    color: "#1D2330",
    fontSize: 14,
    fontWeight: "700"
  },
  optionTextSelected: {
    color: "#ffffff"
  },
  selectedSummary: { backgroundColor: "#FAEEDA", borderRadius: 8, gap: 8, padding: 10 },
  selectedSummaryText: { color: "#854F0B", fontSize: 12, fontWeight: "900" },
  comunaList: { borderColor: "#E7E0DA", borderRadius: 8, borderWidth: 1, maxHeight: 300 },
  comunaRow: { alignItems: "center", backgroundColor: "#FCFAF7", borderBottomColor: "#E7E0DA", borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", minHeight: 54, paddingHorizontal: 12, paddingVertical: 8 },
  comunaRowSelected: { backgroundColor: "#EE7C2B" },
  comunaCopy: { flex: 1 },
  comunaName: { color: "#1D2330", fontSize: 14, fontWeight: "800" },
  comunaRegion: { color: "#626D84", fontSize: 11, marginTop: 2 },
  comunaSelectedText: { color: "#ffffff" },
  emptyCatalogBox: {
    backgroundColor: "#FCFAF7",
    borderColor: "#E7E0DA",
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 14
  },
  emptyCatalogText: {
    color: "#626D84",
    fontSize: 14
  },
  toggleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 54
  },
  toggleRowSelected: {
    borderColor: "#EE7C2B"
  },
  checkbox: {
    alignItems: "center",
    backgroundColor: "#FCFAF7",
    borderColor: "#E7E0DA",
    borderRadius: 6,
    borderWidth: 1,
    height: 24,
    justifyContent: "center",
    width: 24
  },
  checkboxSelected: {
    backgroundColor: "#EE7C2B",
    borderColor: "#EE7C2B"
  },
  toggleCopy: {
    flex: 1,
    gap: 4
  },
  feedbackError: {
    alignItems: "center",
    backgroundColor: "#FCEBEB",
    borderColor: "#FCEBEB",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
    padding: 12
  },
  feedbackNotice: {
    alignItems: "center",
    backgroundColor: "#EAF3DE",
    borderColor: "#EAF3DE",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
    padding: 12
  },
  error: {
    color: "#A32D2D",
    flex: 1,
    fontSize: 14,
    fontWeight: "700"
  },
  notice: {
    color: "#367D5F",
    flex: 1,
    fontSize: 14,
    fontWeight: "700"
  },
  rejectionBanner: {
    alignItems: "flex-start",
    backgroundColor: "#FCEBEB",
    borderColor: "#FCEBEB",
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginBottom: 18,
    padding: 14
  },
  rejectionBannerCopy: {
    flex: 1
  },
  rejectionBannerTitle: {
    color: "#A32D2D",
    fontSize: 14,
    fontWeight: "900",
    marginBottom: 4
  },
  rejectionBannerText: {
    color: "#A32D2D",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18
  },
  modalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(15,23,42,0.52)",
    flex: 1,
    justifyContent: "center",
    padding: 22
  },
  rejectionModal: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 22,
    width: "100%"
  },
  rejectionModalIcon: {
    alignItems: "center",
    backgroundColor: "#FCEBEB",
    borderRadius: 24,
    height: 52,
    justifyContent: "center",
    marginBottom: 16,
    width: 52
  },
  rejectionModalTitle: {
    color: "#1D2330",
    fontSize: 21,
    fontWeight: "900",
    marginBottom: 8,
    textAlign: "center"
  },
  rejectionModalText: {
    color: "#626D84",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    marginBottom: 18,
    textAlign: "center"
  },
  rejectionModalButton: {
    alignItems: "center",
    backgroundColor: "#EE7C2B",
    borderRadius: 8,
    height: 46,
    justifyContent: "center",
    paddingHorizontal: 20,
    width: "100%"
  },
  rejectionModalButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "900"
  },
  actions: {
    backgroundColor: "#F1EFE8",
    borderTopColor: "#E7E0DA",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingBottom: Platform.OS === "ios" ? 24 : 16,
    paddingHorizontal: 20,
    paddingTop: 12
  },
  ghostButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#E7E0DA",
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 52,
    justifyContent: "center"
  },
  ghostText: {
    color: "#1D2330",
    fontSize: 16,
    fontWeight: "700"
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#EE7C2B",
    borderRadius: 8,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    minHeight: 52,
    justifyContent: "center"
  },
  primaryText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700"
  },
  disabledButton: {
    opacity: 0.5
  },
  reviewButton: {
    alignItems: "center",
    backgroundColor: "#1D2330",
    borderRadius: 8,
    flexDirection: "row",
    gap: 8,
    minHeight: 52,
    justifyContent: "center",
    marginTop: 12
  },
  reviewText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800"
  },
  emptyTitle: {
    color: "#1D2330",
    fontSize: 22,
    fontWeight: "800"
  },
  emptyText: {
    color: "#626D84",
    fontSize: 15,
    marginTop: 8,
    textAlign: "center"
  },
  secondaryButton: {
    marginTop: 20,
    padding: 12
  },
  secondaryText: {
    color: "#EE7C2B",
    fontSize: 15,
    fontWeight: "700"
  }
});
