module.exports = {
    "parser": "babel-eslint",
    "env": {
        "es6": true,
        "node": true
    },
    "extends": "eslint:recommended",
    "rules": {
        "accessor-pairs": "error",
        "array-bracket-newline": "off",
        "array-bracket-spacing": "off",
        "array-callback-return": "off",
        "array-element-newline": "off",
        "arrow-body-style": "off",
        "arrow-parens": [
            "error",
            "as-needed"
        ],
        "arrow-spacing": [
            "error",
            {
                "after": true,
                "before": true
            }
        ],
        "block-scoped-var": "off",
        "block-spacing": "off",
        "brace-style": "off",
        "callback-return": "off",
        "camelcase": "off",
        "capitalized-comments": "off",
        "class-methods-use-this": "off",
        "comma-dangle": "off",
        "comma-spacing": "off",
        "comma-style": "off",
        "complexity": "off",
        "computed-property-spacing": "off",
        "consistent-return": "off",
        "consistent-this": "off",
        "curly": "off",
        "default-case": "off",
        "dot-location": [
            "error",
            "property"
        ],
        "dot-notation": "off",
        "eol-last": "off",
        "eqeqeq": "off",
        "for-direction": "error",
        "func-call-spacing": "off",
        "func-name-matching": "off",
        "func-names": "off",
        "func-style": "off",
        "generator-star-spacing": "error",
        "global-require": "off",
        "guard-for-in": "off",
        "handle-callback-err": "off",
        "id-blacklist": "error",
        "id-length": "off",
        "id-match": "error",
        "indent": "off",
        "indent-legacy": "off",
        "init-declarations": "off",
        "jsx-quotes": "error",
        "key-spacing": "off",
        "keyword-spacing": "off",
        "line-comment-position": "off",
        "linebreak-style": "off",
        "lines-around-comment": "off",
        "lines-around-directive": "off",
        "max-depth": "off",
        "max-len": "off",
        "max-lines": "off",
        "max-nested-callbacks": "error",
        "max-params": "off",
        "max-statements": "off",
        "max-statements-per-line": "off",
        "multiline-ternary": "off",
        "new-parens": "off",
        "newline-after-var": "off",
        "newline-before-return": "off",
        "newline-per-chained-call": "off",
        "no-alert": "error",
        "no-array-constructor": "off",
        "no-await-in-loop": "error",
        "no-bitwise": "off",
        "no-buffer-constructor": "off",
        "no-caller": "error",
        "no-catch-shadow": "off",
        "no-confusing-arrow": "error",
        "no-continue": "off",
        "no-div-regex": "off",
        "no-duplicate-imports": "error",
        "no-else-return": "off",
        "no-empty-function": "off",
        "no-eq-null": "off",
        "no-eval": "off",
        "no-extend-native": "off",
        "no-extra-bind": "off",
        "no-extra-label": "off",
        "no-extra-parens": "off",
        "no-floating-decimal": "off",
        "no-implicit-coercion": [
            "error",
            {
                "boolean": false,
                "number": false,
                "string": false
            }
        ],
        "no-implicit-globals": "off",
        "no-implied-eval": "error",
        "no-inline-comments": "off",
        "no-inner-declarations": [
            "error",
            "functions"
        ],
        "no-invalid-this": "off",
        "no-iterator": "error",
        "no-label-var": "off",
        "no-lone-blocks": "off",
        "no-lonely-if": "off",
        "no-loop-func": "off",
        "no-magic-numbers": "off",
        "no-mixed-operators": "off",
        "no-mixed-requires": "error",
        "no-multi-assign": "off",
        "no-multi-spaces": "off",
        "no-multi-str": "error",
        "no-multiple-empty-lines": ["error", {"max": 2}],
        "no-native-reassign": "error",
        "no-negated-condition": "off",
        "no-negated-in-lhs": "error",
        "no-nested-ternary": "off",
        "no-new": "off",
        "no-new-func": "off",
        "no-new-object": "off",
        "no-new-require": "error",
        "no-new-wrappers": "off",
        "no-octal-escape": "error",
        "no-param-reassign": "off",
        "no-path-concat": "off",
        "no-plusplus": "off",
        "no-process-env": "off",
        "no-process-exit": "error",
        "no-proto": "off",
        "no-prototype-builtins": "off",
        "no-restricted-globals": "error",
        "no-restricted-imports": "error",
        "no-restricted-modules": "error",
        "no-restricted-properties": "error",
        "no-restricted-syntax": "error",
        "no-return-assign": "off",
        "no-return-await": "error",
        "no-script-url": "off",
        "no-self-compare": "off",
        "no-sequences": "off",
        "no-shadow": "off",
        "no-shadow-restricted-names": "off",
        "no-spaced-func": "off",
        "no-sync": "off",
        "no-tabs": "off",
        "no-template-curly-in-string": "error",
        "no-ternary": "off",
        "no-throw-literal": "off",
        "no-trailing-spaces": "error",
        "no-undef-init": "off",
        "no-undefined": "off",
        "no-underscore-dangle": "off",
        "no-unmodified-loop-condition": "off",
        "no-unneeded-ternary": "off",
        "no-unused-expressions": "off",
        "no-use-before-define": "off",
        "no-useless-call": "off",
        "no-useless-computed-key": "error",
        "no-useless-concat": "off",
        "no-useless-constructor": "error",
        "no-useless-rename": "error",
        "no-useless-return": "off",
        "no-var": "off",
        "no-void": "off",
        "no-warning-comments": "off",
        "no-whitespace-before-property": "off",
        "no-with": "error",
        "nonblock-statement-body-position": [
            "error",
            "any"
        ],
        "object-curly-newline": "off",
        "object-curly-spacing": "off",
        "object-property-newline": "off",
        "object-shorthand": "off",
        "one-var": "off",
        "one-var-declaration-per-line": "off",
        "operator-assignment": "off",
        "operator-linebreak": "off",
        "padded-blocks": "off",
        "padding-line-between-statements": "error",
        "prefer-arrow-callback": "off",
        "prefer-const": "off",
        "prefer-destructuring": [
            "error",
            {
                "array": false,
                "object": false
            }
        ],
        "prefer-numeric-literals": "error",
        "prefer-promise-reject-errors": "error",
        "prefer-reflect": "off",
        "prefer-rest-params": "off",
        "prefer-spread": "off",
        "prefer-template": "off",
        "quote-props": "off",
        "quotes": ["error", "single"],
        "radix": "off",
        "require-await": "error",
        "require-jsdoc": "off",
        "rest-spread-spacing": "error",
        "semi": "error",
        "semi-spacing": "off",
        "semi-style": "off",
        "sort-imports": "error",
        "sort-keys": "off",
        "sort-vars": "off",
        "space-before-blocks": "off",
        "space-before-function-paren": "off",
        "space-in-parens": "off",
        "space-infix-ops": "off",
        "space-unary-ops": "off",
        "spaced-comment": "off",
        "strict": "off",
        "switch-colon-spacing": "off",
        "symbol-description": "off",
        "template-curly-spacing": [
            "error",
            "never"
        ],
        "template-tag-spacing": "error",
        "unicode-bom": "off",
        "valid-jsdoc": "off",
        "valid-typeof": [
            "error",
            {
                "requireStringLiterals": false
            }
        ],
        "vars-on-top": "off",
        "wrap-iife": "off",
        "wrap-regex": "off",
        "yield-star-spacing": "error",
        "yoda": "off",

        "require-path-exists/exists": [ 2, {
          "extensions": [
            "",
            ".js",
            ".jsx",
            ".es.js",
            ".jsx",
            ".json5",
            ".es",
            ".es6",
            ".coffee"
          ],
        }]
    },
    "plugins": [
        "require-path-exists"
    ],
};
