use crate::state::{Competition, Competitor};

use anchor_lang::prelude::*;
use drift::state::user::UserStats;

pub fn is_user_stats_for_competitor(
    competitor: &AccountLoader<Competitor>,
    user_stats: &AccountLoader<UserStats>,
) -> Result<bool> {
    Ok(competitor.load()?.user_stats.eq(&user_stats.key()))
}

pub fn is_sponsor_for_competition<'info>(
    competition: &AccountLoader<'info, Competition>,
    sponsor: &Signer<'info>,
) -> Result<bool> {
    Ok(competition.load()?.sponsor_info.sponsor.eq(&sponsor.key()))
}