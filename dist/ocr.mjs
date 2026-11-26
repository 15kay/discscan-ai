let worker;

export async function readText(image, onProgress = () => {}) {
  const local = name => new URL(name, import.meta.url).href;
  worker ??= globalThis.Tesseract.createWorker('eng', 1, {
    workerPath: local('ocr/worker.min.js'),
    corePath: local('ocr/tesseract-core-lstm.js'),
    langPath: local('ocr'),
    workerBlobURL: false,
    logger: onProgress,
  });
  try {
    const engine = await worker;
    await engine.setParameters({ tessedit_pageseg_mode: '11' });
    const { data } = await engine.recognize(image);
    return data.text;
  } catch (error) {
    const failed = worker;
    worker = undefined;
    failed.then(engine => engine.terminate()).catch(() => {});
    throw error;
  }
}
