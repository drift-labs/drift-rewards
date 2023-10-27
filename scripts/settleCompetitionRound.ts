import * as anchor from '@coral-xyz/anchor';
import { Program } from '@coral-xyz/anchor';
import { DriftCompetitions } from '../ts/sdk/src/types/drift_competitions';
import {
	CompetitionsClient,
} from '../ts/sdk/src';
import { DriftClient, isVariant } from '@drift-labs/sdk';
import dotenv from "dotenv";

dotenv.config();

function sleep(ms) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

const RPC_ENDPOINT = process.env.RPC_OVERRIDE ?? 'https://api.devnet.solana.com';

async function settleSweepstakesCompetition(provider) {
	// Configure client to use the provider.
	anchor.setProvider(provider);

	const payer = (provider.wallet as anchor.Wallet).payer;
	console.log(`PAYER: ${payer.publicKey}`);

	const driftClient = new DriftClient({
		connection: provider.connection,
		// env: 'mainnet-beta',
		env: 'devnet',

		wallet: provider.wallet,
	});

	const competitionClient = new CompetitionsClient({
		driftClient,
	});

	const program = competitionClient.program as Program<DriftCompetitions>;

	const name = 'sweepstakes';
	const competitionKey = competitionClient.getCompetitionPublicKey(name);
	let competitionAccount = await program.account.competition.fetch(
		competitionKey
	);

	await competitionClient.driftClient.subscribe();
	const details = await competitionClient.getCompetitionDetails(competitionKey);

	console.log('max prize: ', details.prizePools[2].toNumber() / 1e6);

	if (isVariant(competitionAccount.status, 'active')) {
		while (
			competitionAccount.nextRoundExpiryTs.toNumber() >
			Date.now() / 1000
		) {
			const timeTilEnd = Math.round(
				competitionAccount.nextRoundExpiryTs.toNumber() - Date.now() / 1000
			);
			console.log('waiting for roundExpiry in ', timeTilEnd, 'seconds');
			await sleep(timeTilEnd * 1000);
		}

		if (
			!competitionAccount.numberOfCompetitors.eq(
				competitionAccount.numberOfCompetitorsSettled
			)
		) {
			const txSig = await competitionClient.settleAllCompetitors(
				competitionKey,
				competitionAccount.roundNumber,
				3,
				3

			);
			console.log(txSig);
		}
		await sleep(2000);

		const txSig2 = await competitionClient.requestRandomness(
			competitionClient.getCompetitionPublicKey(name)
		);
		console.log(txSig2);
		await sleep(2000);
	} else if (isVariant(competitionAccount.status, 'winnerAndPrizeRandomnessRequested')) {
		const txSig2 = await competitionClient.requestRandomness(
			competitionClient.getCompetitionPublicKey(name)
		);
		console.log(txSig2);
		await sleep(2000);
	}

	let isReadyForSettlement = isVariant(
		competitionAccount.status,
		'winnerAndPrizeRandomnessComplete'
	);

	while(!isReadyForSettlement){
		await sleep(1000);
		competitionAccount = await program.account.competition.fetch(
		competitionKey
		);
		console.log(competitionAccount.status);
		isReadyForSettlement = isVariant(
			competitionAccount.status,
			'winnerAndPrizeRandomnessComplete'
		);
	}
	

	if (isReadyForSettlement) {
		while (isReadyForSettlement) {
			const txSig = await competitionClient.settleNextWinner(
				competitionClient.getCompetitionPublicKey(name)
			);

			console.log(txSig);

			await sleep(1000);
			competitionAccount = await program.account.competition.fetch(
				competitionKey
			);
			isReadyForSettlement = isVariant(
				competitionAccount.status,
				'winnerAndPrizeRandomnessComplete'
			);
		}
	}
}

try {
	if (!process.env.ANCHOR_WALLET) {
		throw new Error('ANCHOR_WALLET must be set.');
	}
	settleSweepstakesCompetition(
		anchor.AnchorProvider.local(
			RPC_ENDPOINT,
			{
				preflightCommitment: 'confirmed',
				skipPreflight: true,
				commitment: 'confirmed',
			}
		)
	);
} catch (e) {
	console.error(e);
}