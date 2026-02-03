use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("AG0RA1111111111111111111111111111111111111");

#[program]
pub mod agora {
    use super::*;

    /// Initialize the marketplace (one-time setup).
    pub fn initialize_marketplace(ctx: Context<InitializeMarketplace>) -> Result<()> {
        let marketplace = &mut ctx.accounts.marketplace;
        marketplace.authority = ctx.accounts.authority.key();
        marketplace.operator = ctx.accounts.operator.key();
        marketplace.listing_count = 0;
        marketplace.completed_trades = 0;
        marketplace.total_volume_cents = 0;
        marketplace.dispute_count = 0;
        marketplace.bump = ctx.bumps.marketplace;

        emit!(MarketplaceCreated {
            marketplace: marketplace.key(),
            authority: marketplace.authority,
            operator: marketplace.operator,
        });
        Ok(())
    }

    /// Register a user profile on-chain.
    pub fn register_user(ctx: Context<RegisterUser>, username: String) -> Result<()> {
        require!(username.len() >= 3 && username.len() <= 32, AgoraError::InvalidUsername);

        let profile = &mut ctx.accounts.profile;
        profile.owner = ctx.accounts.owner.key();
        profile.username = username;
        profile.trades_completed = 0;
        profile.trades_as_seller = 0;
        profile.trades_as_buyer = 0;
        profile.disputes_involved = 0;
        profile.disputes_lost = 0;
        profile.total_volume_cents = 0;
        profile.reputation_score = 500; // start at neutral (0-1000 scale)
        profile.created_at = Clock::get()?.unix_timestamp;
        profile.banned = false;
        profile.bump = ctx.bumps.profile;

        emit!(UserRegistered {
            profile: profile.key(),
            owner: profile.owner,
            username: profile.username.clone(),
        });
        Ok(())
    }

    /// Create a new listing (good or service for sale).
    pub fn create_listing(
        ctx: Context<CreateListing>,
        data: ListingData,
    ) -> Result<()> {
        require!(!ctx.accounts.seller_profile.banned, AgoraError::UserBanned);
        require!(data.price_cents > 0, AgoraError::InvalidPrice);
        require!(data.title.len() >= 3 && data.title.len() <= 120, AgoraError::InvalidTitle);
        require!(data.description.len() <= 2000, AgoraError::DescriptionTooLong);

        let marketplace = &mut ctx.accounts.marketplace;
        let listing = &mut ctx.accounts.listing;

        listing.marketplace = marketplace.key();
        listing.index = marketplace.listing_count;
        listing.seller = ctx.accounts.seller.key();
        listing.title = data.title;
        listing.description = data.description;
        listing.category = data.category;
        listing.price_cents = data.price_cents;
        listing.currency_mint = data.currency_mint;
        listing.status = ListingStatus::Active;
        listing.created_at = Clock::get()?.unix_timestamp;
        listing.bump = ctx.bumps.listing;

        marketplace.listing_count += 1;

        emit!(ListingCreated {
            listing: listing.key(),
            seller: listing.seller,
            title: listing.title.clone(),
            price_cents: listing.price_cents,
            category: listing.category.clone(),
        });
        Ok(())
    }

    /// Buyer initiates a purchase -- funds go into escrow.
    pub fn purchase(ctx: Context<Purchase>) -> Result<()> {
        let listing = &ctx.accounts.listing;
        require!(listing.status == ListingStatus::Active, AgoraError::ListingNotActive);
        require!(!ctx.accounts.buyer_profile.banned, AgoraError::UserBanned);
        require!(
            ctx.accounts.buyer.key() != listing.seller,
            AgoraError::CannotBuyOwnListing
        );

        // Transfer USDC from buyer to escrow PDA
        let amount = listing.price_cents; // USDC has 6 decimals, cents = amount * 10_000
        let transfer_amount = (amount as u64) * 10_000; // cents to USDC smallest unit

        let cpi_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.buyer_token_account.to_account_info(),
                to: ctx.accounts.escrow_token_account.to_account_info(),
                authority: ctx.accounts.buyer.to_account_info(),
            },
        );
        token::transfer(cpi_ctx, transfer_amount)?;

        // Create the order
        let order = &mut ctx.accounts.order;
        order.listing = listing.key();
        order.buyer = ctx.accounts.buyer.key();
        order.seller = listing.seller;
        order.amount_cents = listing.price_cents;
        order.status = OrderStatus::Funded;
        order.created_at = Clock::get()?.unix_timestamp;
        order.completed_at = None;
        order.dispute_id = None;
        order.bump = ctx.bumps.order;

        // Mark listing as sold
        let listing_mut = &mut ctx.accounts.listing;
        listing_mut.status = ListingStatus::Sold;

        emit!(OrderCreated {
            order: order.key(),
            listing: order.listing,
            buyer: order.buyer,
            seller: order.seller,
            amount_cents: order.amount_cents,
        });
        Ok(())
    }

    /// Buyer confirms delivery -- escrow releases to seller.
    pub fn confirm_delivery(ctx: Context<ConfirmDelivery>) -> Result<()> {
        let order = &mut ctx.accounts.order;
        require!(order.status == OrderStatus::Funded, AgoraError::OrderNotFunded);

        let transfer_amount = (order.amount_cents as u64) * 10_000;

        // Release escrow to seller
        let marketplace_key = ctx.accounts.marketplace.key();
        let seeds = &[
            b"escrow",
            marketplace_key.as_ref(),
            &[ctx.accounts.marketplace.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.seller_token_account.to_account_info(),
                authority: ctx.accounts.marketplace.to_account_info(),
            },
            signer_seeds,
        );
        token::transfer(cpi_ctx, transfer_amount)?;

        order.status = OrderStatus::Completed;
        order.completed_at = Some(Clock::get()?.unix_timestamp);

        // Update profiles
        let buyer_profile = &mut ctx.accounts.buyer_profile;
        buyer_profile.trades_completed += 1;
        buyer_profile.trades_as_buyer += 1;
        buyer_profile.total_volume_cents += order.amount_cents;
        buyer_profile.reputation_score = (buyer_profile.reputation_score + 10).min(1000);

        let seller_profile = &mut ctx.accounts.seller_profile;
        seller_profile.trades_completed += 1;
        seller_profile.trades_as_seller += 1;
        seller_profile.total_volume_cents += order.amount_cents;
        seller_profile.reputation_score = (seller_profile.reputation_score + 10).min(1000);

        // Update marketplace stats
        let marketplace = &mut ctx.accounts.marketplace;
        marketplace.completed_trades += 1;
        marketplace.total_volume_cents += order.amount_cents;

        emit!(OrderCompleted {
            order: order.key(),
            buyer: order.buyer,
            seller: order.seller,
            amount_cents: order.amount_cents,
        });
        Ok(())
    }

    /// Either party opens a dispute -- escrow stays locked.
    pub fn open_dispute(
        ctx: Context<OpenDispute>,
        reason: String,
        evidence: String,
    ) -> Result<()> {
        let order = &mut ctx.accounts.order;
        require!(order.status == OrderStatus::Funded, AgoraError::OrderNotFunded);
        require!(reason.len() >= 10 && reason.len() <= 500, AgoraError::InvalidDisputeReason);

        let marketplace = &mut ctx.accounts.marketplace;
        let dispute = &mut ctx.accounts.dispute;

        dispute.order = order.key();
        dispute.opener = ctx.accounts.disputer.key();
        dispute.buyer = order.buyer;
        dispute.seller = order.seller;
        dispute.reason = reason;
        dispute.evidence_opener = evidence;
        dispute.evidence_respondent = String::new();
        dispute.amount_cents = order.amount_cents;
        dispute.status = DisputeStatus::Open;
        dispute.resolution = None;
        dispute.resolved_by = None;
        dispute.created_at = Clock::get()?.unix_timestamp;
        dispute.resolved_at = None;
        dispute.bump = ctx.bumps.dispute;

        order.status = OrderStatus::Disputed;
        order.dispute_id = Some(dispute.key());
        marketplace.dispute_count += 1;

        emit!(DisputeOpened {
            dispute: dispute.key(),
            order: order.key(),
            opener: dispute.opener,
            reason: dispute.reason.clone(),
        });
        Ok(())
    }

    /// Respondent submits evidence for a dispute.
    pub fn submit_dispute_evidence(
        ctx: Context<SubmitEvidence>,
        evidence: String,
    ) -> Result<()> {
        let dispute = &mut ctx.accounts.dispute;
        require!(dispute.status == DisputeStatus::Open, AgoraError::DisputeNotOpen);
        require!(evidence.len() <= 2000, AgoraError::EvidenceTooLong);

        let signer = ctx.accounts.respondent.key();
        require!(
            signer == dispute.buyer || signer == dispute.seller,
            AgoraError::NotDisputeParty
        );
        require!(signer != dispute.opener, AgoraError::AlreadySubmittedEvidence);

        dispute.evidence_respondent = evidence;
        dispute.status = DisputeStatus::UnderReview;

        emit!(DisputeEvidenceSubmitted {
            dispute: dispute.key(),
            respondent: signer,
        });
        Ok(())
    }

    /// Operator (JENNY) resolves the dispute.
    pub fn resolve_dispute(
        ctx: Context<ResolveDispute>,
        resolution: DisputeResolution,
        reasoning: String,
    ) -> Result<()> {
        let dispute = &mut ctx.accounts.dispute;
        require!(
            dispute.status == DisputeStatus::Open || dispute.status == DisputeStatus::UnderReview,
            AgoraError::DisputeNotOpen
        );

        let transfer_amount = (dispute.amount_cents as u64) * 10_000;
        let marketplace_key = ctx.accounts.marketplace.key();
        let seeds = &[
            b"escrow",
            marketplace_key.as_ref(),
            &[ctx.accounts.marketplace.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        // Release funds based on resolution
        let destination = match &resolution {
            DisputeResolution::BuyerWins => ctx.accounts.buyer_token_account.to_account_info(),
            DisputeResolution::SellerWins => ctx.accounts.seller_token_account.to_account_info(),
            DisputeResolution::Split { buyer_pct } => {
                // First send buyer's portion
                let buyer_amount = transfer_amount * (*buyer_pct as u64) / 100;
                let seller_amount = transfer_amount - buyer_amount;

                if buyer_amount > 0 {
                    let cpi_buyer = CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        Transfer {
                            from: ctx.accounts.escrow_token_account.to_account_info(),
                            to: ctx.accounts.buyer_token_account.to_account_info(),
                            authority: ctx.accounts.marketplace.to_account_info(),
                        },
                        signer_seeds,
                    );
                    token::transfer(cpi_buyer, buyer_amount)?;
                }
                if seller_amount > 0 {
                    let cpi_seller = CpiContext::new_with_signer(
                        ctx.accounts.token_program.to_account_info(),
                        Transfer {
                            from: ctx.accounts.escrow_token_account.to_account_info(),
                            to: ctx.accounts.seller_token_account.to_account_info(),
                            authority: ctx.accounts.marketplace.to_account_info(),
                        },
                        signer_seeds,
                    );
                    token::transfer(cpi_seller, seller_amount)?;
                }

                // Skip the single transfer below
                dispute.resolution = Some(resolution);
                dispute.resolved_by = Some(ctx.accounts.operator.key());
                dispute.resolved_at = Some(Clock::get()?.unix_timestamp);
                dispute.status = DisputeStatus::Resolved;

                let order = &mut ctx.accounts.order;
                order.status = OrderStatus::Resolved;

                emit!(DisputeResolved {
                    dispute: dispute.key(),
                    resolution: "split".to_string(),
                    reasoning,
                });
                return Ok(());
            }
        };

        // Single-winner transfer
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: destination,
                authority: ctx.accounts.marketplace.to_account_info(),
            },
            signer_seeds,
        );
        token::transfer(cpi_ctx, transfer_amount)?;

        let resolution_str = match &resolution {
            DisputeResolution::BuyerWins => "buyer_wins",
            DisputeResolution::SellerWins => "seller_wins",
            _ => "split",
        };

        // Update loser reputation
        match &resolution {
            DisputeResolution::BuyerWins => {
                let seller_profile = &mut ctx.accounts.seller_profile;
                seller_profile.disputes_involved += 1;
                seller_profile.disputes_lost += 1;
                seller_profile.reputation_score = seller_profile.reputation_score.saturating_sub(50);
            }
            DisputeResolution::SellerWins => {
                let buyer_profile = &mut ctx.accounts.buyer_profile;
                buyer_profile.disputes_involved += 1;
                buyer_profile.disputes_lost += 1;
                buyer_profile.reputation_score = buyer_profile.reputation_score.saturating_sub(50);
            }
            _ => {}
        }

        dispute.resolution = Some(resolution);
        dispute.resolved_by = Some(ctx.accounts.operator.key());
        dispute.resolved_at = Some(Clock::get()?.unix_timestamp);
        dispute.status = DisputeStatus::Resolved;

        let order = &mut ctx.accounts.order;
        order.status = OrderStatus::Resolved;

        emit!(DisputeResolved {
            dispute: dispute.key(),
            resolution: resolution_str.to_string(),
            reasoning,
        });
        Ok(())
    }

    /// Operator bans a user for fraud.
    pub fn ban_user(ctx: Context<OperatorAction>) -> Result<()> {
        let profile = &mut ctx.accounts.target_profile;
        profile.banned = true;

        emit!(UserBanned {
            profile: profile.key(),
            owner: profile.owner,
        });
        Ok(())
    }

    /// Seller cancels an active listing (no buyer yet).
    pub fn cancel_listing(ctx: Context<CancelListing>) -> Result<()> {
        let listing = &mut ctx.accounts.listing;
        require!(listing.status == ListingStatus::Active, AgoraError::ListingNotActive);
        listing.status = ListingStatus::Cancelled;

        emit!(ListingCancelled {
            listing: listing.key(),
        });
        Ok(())
    }
}

// ============================================================
// Constants
// ============================================================

pub const MAX_TITLE_LEN: usize = 120;
pub const MAX_DESC_LEN: usize = 2000;
pub const MAX_CATEGORY_LEN: usize = 32;
pub const MAX_USERNAME_LEN: usize = 32;
pub const MAX_EVIDENCE_LEN: usize = 2000;

// ============================================================
// Accounts
// ============================================================

#[account]
pub struct Marketplace {
    pub authority: Pubkey,
    pub operator: Pubkey, // JENNY -- the AI agent
    pub listing_count: u64,
    pub completed_trades: u64,
    pub total_volume_cents: u64,
    pub dispute_count: u64,
    pub bump: u8,
}

#[account]
pub struct UserProfile {
    pub owner: Pubkey,
    pub username: String,
    pub trades_completed: u64,
    pub trades_as_seller: u64,
    pub trades_as_buyer: u64,
    pub disputes_involved: u64,
    pub disputes_lost: u64,
    pub total_volume_cents: u64,
    pub reputation_score: u16, // 0-1000
    pub created_at: i64,
    pub banned: bool,
    pub bump: u8,
}

#[account]
pub struct Listing {
    pub marketplace: Pubkey,
    pub index: u64,
    pub seller: Pubkey,
    pub title: String,
    pub description: String,
    pub category: String,
    pub price_cents: u64,
    pub currency_mint: Pubkey,
    pub status: ListingStatus,
    pub created_at: i64,
    pub bump: u8,
}

#[account]
pub struct Order {
    pub listing: Pubkey,
    pub buyer: Pubkey,
    pub seller: Pubkey,
    pub amount_cents: u64,
    pub status: OrderStatus,
    pub created_at: i64,
    pub completed_at: Option<i64>,
    pub dispute_id: Option<Pubkey>,
    pub bump: u8,
}

#[account]
pub struct Dispute {
    pub order: Pubkey,
    pub opener: Pubkey,
    pub buyer: Pubkey,
    pub seller: Pubkey,
    pub reason: String,
    pub evidence_opener: String,
    pub evidence_respondent: String,
    pub amount_cents: u64,
    pub status: DisputeStatus,
    pub resolution: Option<DisputeResolution>,
    pub resolved_by: Option<Pubkey>,
    pub created_at: i64,
    pub resolved_at: Option<i64>,
    pub bump: u8,
}

// ============================================================
// Data Types
// ============================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ListingData {
    pub title: String,
    pub description: String,
    pub category: String,
    pub price_cents: u64,
    pub currency_mint: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum ListingStatus {
    Active,
    Sold,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum OrderStatus {
    Funded,
    Completed,
    Disputed,
    Resolved,
    Refunded,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum DisputeStatus {
    Open,
    UnderReview,
    Resolved,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum DisputeResolution {
    BuyerWins,
    SellerWins,
    Split { buyer_pct: u8 },
}

// ============================================================
// Contexts
// ============================================================

#[derive(Accounts)]
pub struct InitializeMarketplace<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 8 + 8 + 8 + 8 + 1 + 64,
        seeds = [b"marketplace"],
        bump
    )]
    pub marketplace: Account<'info, Marketplace>,
    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: operator pubkey stored
    pub operator: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterUser<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + 32 + (4 + MAX_USERNAME_LEN) + 8 * 6 + 2 + 8 + 1 + 1 + 64,
        seeds = [b"profile", owner.key().as_ref()],
        bump
    )]
    pub profile: Account<'info, UserProfile>,
    #[account(mut)]
    pub owner: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateListing<'info> {
    #[account(mut)]
    pub marketplace: Account<'info, Marketplace>,
    #[account(
        init,
        payer = seller,
        space = 8 + 32 + 8 + 32 + (4 + MAX_TITLE_LEN) + (4 + MAX_DESC_LEN) + (4 + MAX_CATEGORY_LEN) + 8 + 32 + 1 + 8 + 1 + 64,
        seeds = [b"listing", marketplace.key().as_ref(), &marketplace.listing_count.to_le_bytes()],
        bump
    )]
    pub listing: Account<'info, Listing>,
    #[account(
        seeds = [b"profile", seller.key().as_ref()],
        bump = seller_profile.bump,
    )]
    pub seller_profile: Account<'info, UserProfile>,
    #[account(mut)]
    pub seller: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Purchase<'info> {
    #[account(mut)]
    pub marketplace: Account<'info, Marketplace>,
    #[account(mut)]
    pub listing: Account<'info, Listing>,
    #[account(
        init,
        payer = buyer,
        space = 8 + 32 + 32 + 32 + 8 + 1 + 8 + 9 + 33 + 1 + 64,
        seeds = [b"order", listing.key().as_ref(), buyer.key().as_ref()],
        bump
    )]
    pub order: Account<'info, Order>,
    #[account(
        seeds = [b"profile", buyer.key().as_ref()],
        bump = buyer_profile.bump,
    )]
    pub buyer_profile: Account<'info, UserProfile>,
    #[account(mut)]
    pub buyer: Signer<'info>,
    #[account(mut)]
    pub buyer_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub escrow_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ConfirmDelivery<'info> {
    #[account(mut)]
    pub marketplace: Account<'info, Marketplace>,
    #[account(
        mut,
        constraint = order.buyer == buyer.key() @ AgoraError::NotOrderBuyer,
    )]
    pub order: Account<'info, Order>,
    pub buyer: Signer<'info>,
    #[account(mut, seeds = [b"profile", order.buyer.as_ref()], bump = buyer_profile.bump)]
    pub buyer_profile: Account<'info, UserProfile>,
    #[account(mut, seeds = [b"profile", order.seller.as_ref()], bump = seller_profile.bump)]
    pub seller_profile: Account<'info, UserProfile>,
    #[account(mut)]
    pub escrow_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub seller_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct OpenDispute<'info> {
    #[account(mut)]
    pub marketplace: Account<'info, Marketplace>,
    #[account(
        mut,
        constraint = order.buyer == disputer.key() || order.seller == disputer.key() @ AgoraError::NotOrderParty,
    )]
    pub order: Account<'info, Order>,
    #[account(
        init,
        payer = disputer,
        space = 8 + 32 + 32 + 32 + 32 + (4 + 500) + (4 + MAX_EVIDENCE_LEN) + (4 + MAX_EVIDENCE_LEN) + 8 + 1 + 34 + 33 + 8 + 9 + 1 + 128,
        seeds = [b"dispute", order.key().as_ref()],
        bump
    )]
    pub dispute: Account<'info, Dispute>,
    #[account(mut)]
    pub disputer: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SubmitEvidence<'info> {
    #[account(mut)]
    pub dispute: Account<'info, Dispute>,
    pub respondent: Signer<'info>,
}

#[derive(Accounts)]
pub struct ResolveDispute<'info> {
    #[account(
        has_one = operator,
    )]
    pub marketplace: Account<'info, Marketplace>,
    #[account(mut)]
    pub order: Account<'info, Order>,
    #[account(mut, has_one = order)]
    pub dispute: Account<'info, Dispute>,
    pub operator: Signer<'info>,
    #[account(mut, seeds = [b"profile", dispute.buyer.as_ref()], bump = buyer_profile.bump)]
    pub buyer_profile: Account<'info, UserProfile>,
    #[account(mut, seeds = [b"profile", dispute.seller.as_ref()], bump = seller_profile.bump)]
    pub seller_profile: Account<'info, UserProfile>,
    #[account(mut)]
    pub escrow_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub buyer_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub seller_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct OperatorAction<'info> {
    #[account(has_one = operator)]
    pub marketplace: Account<'info, Marketplace>,
    pub operator: Signer<'info>,
    #[account(mut)]
    pub target_profile: Account<'info, UserProfile>,
}

#[derive(Accounts)]
pub struct CancelListing<'info> {
    #[account(
        mut,
        constraint = listing.seller == seller.key() @ AgoraError::NotListingSeller,
    )]
    pub listing: Account<'info, Listing>,
    pub seller: Signer<'info>,
}

// ============================================================
// Events
// ============================================================

#[event]
pub struct MarketplaceCreated {
    pub marketplace: Pubkey,
    pub authority: Pubkey,
    pub operator: Pubkey,
}

#[event]
pub struct UserRegistered {
    pub profile: Pubkey,
    pub owner: Pubkey,
    pub username: String,
}

#[event]
pub struct ListingCreated {
    pub listing: Pubkey,
    pub seller: Pubkey,
    pub title: String,
    pub price_cents: u64,
    pub category: String,
}

#[event]
pub struct OrderCreated {
    pub order: Pubkey,
    pub listing: Pubkey,
    pub buyer: Pubkey,
    pub seller: Pubkey,
    pub amount_cents: u64,
}

#[event]
pub struct OrderCompleted {
    pub order: Pubkey,
    pub buyer: Pubkey,
    pub seller: Pubkey,
    pub amount_cents: u64,
}

#[event]
pub struct ListingCancelled {
    pub listing: Pubkey,
}

#[event]
pub struct DisputeOpened {
    pub dispute: Pubkey,
    pub order: Pubkey,
    pub opener: Pubkey,
    pub reason: String,
}

#[event]
pub struct DisputeEvidenceSubmitted {
    pub dispute: Pubkey,
    pub respondent: Pubkey,
}

#[event]
pub struct DisputeResolved {
    pub dispute: Pubkey,
    pub resolution: String,
    pub reasoning: String,
}

#[event]
pub struct UserBanned {
    pub profile: Pubkey,
    pub owner: Pubkey,
}

// ============================================================
// Errors
// ============================================================

#[error_code]
pub enum AgoraError {
    #[msg("Invalid username (3-32 characters)")]
    InvalidUsername,
    #[msg("Invalid price")]
    InvalidPrice,
    #[msg("Invalid title (3-120 characters)")]
    InvalidTitle,
    #[msg("Description too long (max 2000 characters)")]
    DescriptionTooLong,
    #[msg("Listing is not active")]
    ListingNotActive,
    #[msg("Cannot buy your own listing")]
    CannotBuyOwnListing,
    #[msg("Order is not in funded status")]
    OrderNotFunded,
    #[msg("Not the order buyer")]
    NotOrderBuyer,
    #[msg("Not the listing seller")]
    NotListingSeller,
    #[msg("Not a party to this order")]
    NotOrderParty,
    #[msg("Not a party to this dispute")]
    NotDisputeParty,
    #[msg("Already submitted evidence")]
    AlreadySubmittedEvidence,
    #[msg("Dispute is not open")]
    DisputeNotOpen,
    #[msg("Invalid dispute reason (10-500 characters)")]
    InvalidDisputeReason,
    #[msg("Evidence too long (max 2000 characters)")]
    EvidenceTooLong,
    #[msg("User is banned")]
    UserBanned,
}
