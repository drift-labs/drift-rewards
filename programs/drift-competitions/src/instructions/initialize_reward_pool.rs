use super::constraints::is_sponsor_for_competition;
use crate::state::{Competition};
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

pub fn initialize_reward_pool<'info>(
    ctx: Context<'_, '_, '_, 'info, InitializeRewardPool<'info>>,
) -> Result<()> {
    let mut competition = ctx.accounts.competition.load()?;

    // todo enforce mint
    // todo check mint is already set

    competition.reward_pool = ctx.accounts.reward_pool.key();
    competition.reward_pool_mint = ctx.accounts.reward_pool_mint.key();

    Ok(())
}

#[derive(Accounts)]
pub struct InitializeRewardPool<'info> {
    #[account(
        mut,
        constraint = is_sponsor_for_competition(&competition, &sponsor)?,
        has_one = competition_authority,
    )]
    pub competition: AccountLoader<'info, Competition>,
    #[account(mut)]
    pub sponsor: Signer<'info>,
    /// CHECK: has_one on competition
    pub competition_authority: AccountInfo<'info>,
    #[account(
        init,
        seeds = [b"reward_pool".as_ref()],
        bump,
        payer = sponsor,
        token::mint = reward_pool_mint,
        token::authority = competition_authority
    )]
    pub reward_pool: Box<Account<'info, TokenAccount>>,
    pub reward_pool_mint: Box<Account<'info, Mint>>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}
