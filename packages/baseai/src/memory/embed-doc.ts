import { heading } from '@/utils/heading';
import { checkMemoryExists } from '@/utils/memory/check-memory-exist';
import { generateEmbeddings } from '@/utils/memory/generate-embeddings';
import { validatedocEmbedSchema } from '@/utils/memory/lib';
import { loadMemoryFiles } from '@/utils/memory/load-memory-files';
import * as p from '@clack/prompts';
import color from 'picocolors';

export async function embedDoc({
	memoryName,
	documentName,
	overwrite = false
}: {
	memoryName: string;
	documentName: string;
	overwrite?: boolean;
}) {
	p.intro(
		heading({
			text: 'EMBED DOC',
			sub: `Creating embeddings of Doc: ${color.cyan(documentName)} in memory ${color.cyan(memoryName)}`
		})
	);

	// Spinner to show current action.
	const s = p.spinner();

	try {
		if (!memoryName) {
			p.cancel(
				'Memory name is required. Use --memory or -m flag to specify.'
			);
			process.exit(1);
		}

		if (!documentName) {
			p.cancel(
				'Document name is required. Use --document or -d flag to specify.'
			);
			process.exit(1);
		}

		// 1- Check memory exists.
		const { memoryName: validMemoryName, documentName: validDocumentName } =
			validatedocEmbedSchema({
				memoryName,
				documentName
			});
		await checkMemoryExists(validMemoryName);

		// 2- Load memory data.
		s.start('Processing docs...');
		const memoryFiles = await loadMemoryFiles(validMemoryName);

		if (memoryFiles.length === 0) {
			p.cancel(`No valid documents found in memory '${memoryName}'.`);
			process.exit(1);
		}

		// If it is customDirTracked memory, replace / with - in the doc name.
		// Otherwise keep the doc name as it is, i.e., files are in /documents directory.
		const docNameToSearch = validDocumentName
			.replace(/\//g, '-') // Replace / with - in the doc name.
			.replace(/^[.-]+/, ''); // Remove leading . or - from the doc name.

		// Find the document file.
		const memoryFile = memoryFiles.find(
			file => file.name === docNameToSearch
		);

		if (!memoryFile) {
			s.stop(`Stopped!`);
			p.cancel(
				`Doc: ${color.cyan(validDocumentName)} not found in memory ${validMemoryName}. If this is a custom directory-tracked memory, please provide the full relative path to the document from the tracked directory.`
			);
			process.exit(1);
		}

		// 3- Generate embeddings.
		s.message('Generating embeddings...');
		const result = await generateEmbeddings({
			memoryFiles: [memoryFile],
			memoryName: validMemoryName,
			overwrite: overwrite || false
		});

		s.stop(result);
	} catch (error: any) {
		s.stop(`FAILED from here: ${error.message}`);
		process.exit(1);
	}
}
