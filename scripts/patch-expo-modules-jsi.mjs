import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const packageRoot = resolve('node_modules/expo-modules-jsi');
const headerPath = resolve(packageRoot, 'apple/Sources/ExpoModulesJSI-Cxx/include/RuntimeScheduler.h');
const swiftPath = resolve(packageRoot, 'apple/Sources/ExpoModulesJSI/Runtime/JavaScriptRuntime.swift');

async function patchFile(path, replacements) {
  let source = await readFile(path, 'utf8');
  const original = source;

  for (const [before, after] of replacements) {
    if (source.includes(after)) continue;
    if (!source.includes(before)) {
      throw new Error(`No se encontró el código esperado en ${path}. Revisa si Expo ya corrigió este problema.`);
    }
    source = source.replace(before, after);
  }

  if (source !== original) await writeFile(path, source);
}

await patchFile(headerPath, [
  ['SWIFT_RETURNS_RETAINED RuntimeScheduler(void *scheduler, ScheduleFn fn) noexcept',
    'RuntimeScheduler(void *scheduler, ScheduleFn fn) noexcept'],
  ['SWIFT_RETURNS_RETAINED RuntimeScheduler() {}', 'RuntimeScheduler() {}'],
]);

await patchFile(swiftPath, [
  ['nonisolated(unsafe) let resultPtr = resultPtr', 'let resultPtr = NonisolatedUnsafeVar(resultPtr)'],
  ['nonisolated(unsafe) let thisPtr = thisPtr\n    nonisolated(unsafe) let argumentsPtr = argumentsPtr\n    nonisolated(unsafe) let resultPtr = resultPtr',
    'let thisPtr = NonisolatedUnsafeVar(thisPtr)\n    let argumentsPtr = NonisolatedUnsafeVar(argumentsPtr)\n    let resultPtr = NonisolatedUnsafeVar(resultPtr)'],
  ['to: resultPtr)', 'to: resultPtr.value)'],
  ['mutating: thisPtr).move()', 'mutating: thisPtr.value).move()'],
  ['start: argumentsPtr, count:', 'start: argumentsPtr.value, count:'],
  ['runtime.pointee, thisPtr)', 'runtime.pointee, thisPtr.value)'],
]);

console.log('Compatibilidad de expo-modules-jsi con Xcode 26.3 verificada.');
