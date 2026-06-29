// 파일 → Base64 + 크기 측정
export async function readImageFile(
  file: File,
): Promise<{ base64: string; width: number; height: number }> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('파일 읽기 실패'))
    reader.readAsDataURL(file)
  })

  const { width, height } = await new Promise<{ width: number; height: number }>(
    (resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
      img.onerror = () => reject(new Error('이미지 디코딩 실패'))
      img.src = base64
    },
  )

  return { base64, width, height }
}