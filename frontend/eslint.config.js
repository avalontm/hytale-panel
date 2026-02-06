import js from '@eslint/js';
import globals from 'globals';
import importPlugin from 'eslint-plugin-import';
import reactPlugin from 'eslint-plugin-react';
import babelParser from '@babel/eslint-parser';

export default [
    js.configs.recommended,
    {
        files: ['**/*.{js,jsx}'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            parser: babelParser,
            parserOptions: {
                requireConfigFile: false,
                babelOptions: {
                    presets: ['@babel/preset-react'],
                },
            },
            globals: {
                ...globals.browser,
                ...globals.es2021,
            },
        },
        plugins: {
            import: importPlugin,
            react: reactPlugin,
        },
        rules: {
            'import/no-unresolved': 'error',
            'react/jsx-uses-react': 'error',
            'react/jsx-uses-vars': 'error',
        },
        settings: {
            'import/resolver': {
                node: {
                    extensions: ['.js', '.jsx'],
                },
            },
            react: {
                version: 'detect',
            },
        },
    },
];
