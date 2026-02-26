/**
 * Bun test environment setup. Loaded before any test files via bunfig.toml.
 * Ensures NODE_ENV=test (required) and blocks accidental use of real Firebase.
 */

if (process.env.NODE_ENV !== "test") {
    throw new Error(
        'NODE_ENV must be "test" to run tests. Use "bun run test" instead of running bun directly.',
    )
}

export {}
