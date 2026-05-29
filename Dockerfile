FROM gcr.io/oss-fuzz-base/base-builder-javascript

COPY . $SRC/qrcraftly
WORKDIR $SRC/qrcraftly

COPY build.sh $SRC/
