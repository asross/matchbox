aws s3 sync . s3://mouse-brain-matchbox \
    --exclude "*" \
    --include "*.html" \
    --include "*.css" \
    --include "*.js" \
    --include "*.json" \
    --include "*.png" \
    --acl "public-read"

aws s3 website s3://mouse-brain-matchbox --index-document index.html
