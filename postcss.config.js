module.exports = {
    plugins: [
        [
            'postcss-preset-env',
            {
                stage: 3,
                browsers: [
                    'last 2 versions',
                    '> 1%',
                    'IE 11'
                ],
                features: {
                    'nesting-rules': true,
                    'custom-properties': true,
                    'custom-media-queries': true
                }
            },
        ],
    ],
};
