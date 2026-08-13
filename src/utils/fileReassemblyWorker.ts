/*
    QRCraftly
    Copyright (C) 2025 fderuiter

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published
    by the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

interface StartReassemblyMessage {
  type: 'START_REASSEMBLY';
  chunks: Array<{ index: number; base64: string }>;
  totalChunks: number;
}

self.onmessage = async (e: MessageEvent<StartReassemblyMessage>) => {
  const { type, chunks, totalChunks } = e.data;

  if (type === 'START_REASSEMBLY') {
    try {
      if (!chunks || !Array.isArray(chunks)) {
        throw new Error('Invalid or missing chunks array.');
      }

      // Sort chunks to be absolutely certain of order
      const sortedChunks = [...chunks].sort((a, b) => a.index - b.index);

      // Verify that we have all chunks from 0 to totalChunks - 1
      if (sortedChunks.length !== totalChunks) {
        throw new Error(`Chunk count mismatch. Expected ${totalChunks}, got ${sortedChunks.length}`);
      }

      // Check for missing indices
      for (let i = 0; i < totalChunks; i++) {
        if (sortedChunks[i].index !== i) {
          throw new Error(`Missing chunk at index ${i}`);
        }
      }

      const decodedChunks: Uint8Array[] = [];
      let totalLength = 0;

      // Decode Base64 and report progress
      for (let i = 0; i < totalChunks; i++) {
        const base64Str = sortedChunks[i].base64;
        
        // Custom decode base64
        const binaryString = atob(base64Str);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let j = 0; j < len; j++) {
          bytes[j] = binaryString.charCodeAt(j);
        }

        decodedChunks.push(bytes);
        totalLength += len;

        // Post progress message (dynamic progress)
        const progress = Math.round(((i + 1) / totalChunks) * 100);
        (self as any).postMessage({
          type: 'PROGRESS',
          progress,
          current: i + 1,
          total: totalChunks
        });
      }

      // Merge Uint8Arrays into a single transferable ArrayBuffer
      const mergedArray = new Uint8Array(totalLength);
      let offset = 0;
      for (let i = 0; i < totalChunks; i++) {
        mergedArray.set(decodedChunks[i], offset);
        offset += decodedChunks[i].length;
      }

      const buffer = mergedArray.buffer;

      // Return COMPLETE with transferable ArrayBuffer
      (self as any).postMessage({
        type: 'COMPLETE',
        buffer
      }, [buffer]);

    } catch (err: any) {
      (self as any).postMessage({
        type: 'ERROR',
        error: err?.message || 'Unknown reassembly error'
      });
    }
  }
};
