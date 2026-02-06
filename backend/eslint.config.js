import js from '@eslint/js';
import globals from 'globals';
import importPlugin from 'eslint-plugin-import';

export default [
    js.configs.recommended,
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.node,
                ...globals.es2021,
            },
        },
        plugins: {
            import: importPlugin,
        },
        rules: {
            'import/no-unresolved': 'error',
        },
        settings: {
            'import/resolver': {
                node: {
                    extensions: ['.js'],
                },
            },
        },
    },
];
