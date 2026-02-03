use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

declare_id!("AEG1S111111111111111111111111111111111111111");

#[program]
pub mod aegis {
    use super::*;

    /// Initialize a new treasury vault for a DAO.
    pub fn initialize_vault(
        ctx: Context<InitializeVault>,
        config: VaultConfig,
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.authority = ctx.accounts.authority.key();
        vault.guardian = ctx.accounts.guardian.key();
        vault.proposal_count = 0;
        vault.executed_count = 0;
        vault.approval_threshold = config.approval_threshold;
        vault.signers = config.signers;
        vault.risk_params = config.risk_params;
        vault.created_at = Clock::get()?.unix_timestamp;
        vault.bump = ctx.bumps.vault;

        emit!(VaultCreated {
            vault: vault.key(),
            authority: vault.authority,
            guardian: vault.guardian,
            threshold: vault.approval_threshold,
        });

        Ok(())
    }

    /// Add an approved signer to the vault multisig.
    pub fn add_signer(ctx: Context<ManageSigners>, new_signer: Pubkey) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        require!(
            !vault.signers.contains(&new_signer),
            AegisError::SignerAlreadyExists
        );
        require!(
            vault.signers.len() < MAX_SIGNERS,
            AegisError::MaxSignersReached
        );
        vault.signers.push(new_signer);

        emit!(SignerAdded {
            vault: vault.key(),
            signer: new_signer,
        });
        Ok(())
    }

    /// Remove a signer from the vault multisig.
    pub fn remove_signer(ctx: Context<ManageSigners>, signer: Pubkey) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        let pos = vault
            .signers
            .iter()
            .position(|s| *s == signer)
            .ok_or(AegisError::SignerNotFound)?;
        vault.signers.remove(pos);

        require!(
            vault.signers.len() >= vault.approval_threshold as usize,
            AegisError::ThresholdExceedsSigners
        );

        emit!(SignerRemoved {
            vault: vault.key(),
            signer,
        });
        Ok(())
    }

    /// Update the vault's risk parameters (authority only).
    pub fn update_risk_params(
        ctx: Context<ManageSigners>,
        risk_params: RiskParams,
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.risk_params = risk_params;

        emit!(RiskParamsUpdated {
            vault: vault.key(),
            params: vault.risk_params.clone(),
        });
        Ok(())
    }

    /// Guardian (AI agent) creates a strategy proposal.
    pub fn create_proposal(
        ctx: Context<CreateProposal>,
        proposal_data: ProposalData,
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        let proposal = &mut ctx.accounts.proposal;

        proposal.vault = vault.key();
        proposal.index = vault.proposal_count;
        proposal.proposer = ctx.accounts.guardian.key();
        proposal.strategy = proposal_data.strategy;
        proposal.description = proposal_data.description;
        proposal.status = ProposalStatus::Pending;
        proposal.approvals = vec![];
        proposal.rejections = vec![];
        proposal.created_at = Clock::get()?.unix_timestamp;
        proposal.executed_at = None;
        proposal.bump = ctx.bumps.proposal;

        vault.proposal_count += 1;

        emit!(ProposalCreated {
            vault: vault.key(),
            proposal: proposal.key(),
            index: proposal.index,
            strategy: proposal.strategy.clone(),
        });

        Ok(())
    }

    /// A signer approves a pending proposal.
    pub fn approve_proposal(ctx: Context<VoteProposal>) -> Result<()> {
        let vault = &ctx.accounts.vault;
        let proposal = &mut ctx.accounts.proposal;
        let signer_key = ctx.accounts.signer.key();

        require!(
            proposal.status == ProposalStatus::Pending,
            AegisError::ProposalNotPending
        );
        require!(
            vault.signers.contains(&signer_key),
            AegisError::NotAuthorizedSigner
        );
        require!(
            !proposal.approvals.contains(&signer_key),
            AegisError::AlreadyVoted
        );

        proposal.approvals.push(signer_key);

        // Check if threshold met
        if proposal.approvals.len() >= vault.approval_threshold as usize {
            proposal.status = ProposalStatus::Approved;
            emit!(ProposalApproved {
                vault: vault.key(),
                proposal: proposal.key(),
                index: proposal.index,
            });
        }

        emit!(ProposalVoted {
            vault: vault.key(),
            proposal: proposal.key(),
            signer: signer_key,
            vote: true,
        });

        Ok(())
    }

    /// A signer rejects a pending proposal.
    pub fn reject_proposal(ctx: Context<VoteProposal>) -> Result<()> {
        let vault = &ctx.accounts.vault;
        let proposal = &mut ctx.accounts.proposal;
        let signer_key = ctx.accounts.signer.key();

        require!(
            proposal.status == ProposalStatus::Pending,
            AegisError::ProposalNotPending
        );
        require!(
            vault.signers.contains(&signer_key),
            AegisError::NotAuthorizedSigner
        );
        require!(
            !proposal.rejections.contains(&signer_key),
            AegisError::AlreadyVoted
        );

        proposal.rejections.push(signer_key);

        // If remaining possible approvals can't meet threshold, reject
        let remaining = vault.signers.len() - proposal.approvals.len() - proposal.rejections.len();
        if proposal.approvals.len() + remaining < vault.approval_threshold as usize {
            proposal.status = ProposalStatus::Rejected;
            emit!(ProposalRejected {
                vault: vault.key(),
                proposal: proposal.key(),
                index: proposal.index,
            });
        }

        emit!(ProposalVoted {
            vault: vault.key(),
            proposal: proposal.key(),
            signer: signer_key,
            vote: false,
        });

        Ok(())
    }

    /// Execute an approved proposal — transfers tokens from vault.
    pub fn execute_swap_proposal(ctx: Context<ExecuteSwapProposal>, amount: u64) -> Result<()> {
        let proposal = &mut ctx.accounts.proposal;
        let vault = &ctx.accounts.vault;

        require!(
            proposal.status == ProposalStatus::Approved,
            AegisError::ProposalNotApproved
        );

        // Transfer tokens from vault token account to destination
        let vault_key = vault.authority;
        let seeds = &[
            b"vault",
            vault_key.as_ref(),
            &[vault.bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault_token_account.to_account_info(),
                to: ctx.accounts.destination_token_account.to_account_info(),
                authority: ctx.accounts.vault.to_account_info(),
            },
            signer_seeds,
        );
        token::transfer(transfer_ctx, amount)?;

        proposal.status = ProposalStatus::Executed;
        proposal.executed_at = Some(Clock::get()?.unix_timestamp);

        let vault_mut = &mut ctx.accounts.vault;
        vault_mut.executed_count += 1;

        emit!(ProposalExecuted {
            vault: vault_mut.key(),
            proposal: proposal.key(),
            index: proposal.index,
            amount,
        });

        Ok(())
    }

    /// Deposit tokens into the treasury vault.
    pub fn deposit(ctx: Context<DepositToVault>, amount: u64) -> Result<()> {
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.depositor_token_account.to_account_info(),
                to: ctx.accounts.vault_token_account.to_account_info(),
                authority: ctx.accounts.depositor.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, amount)?;

        emit!(Deposited {
            vault: ctx.accounts.vault.key(),
            depositor: ctx.accounts.depositor.key(),
            amount,
            mint: ctx.accounts.vault_token_account.mint,
        });

        Ok(())
    }

    /// Emergency pause — authority can freeze all proposals.
    pub fn emergency_pause(ctx: Context<ManageSigners>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.paused = true;

        emit!(VaultPaused {
            vault: vault.key(),
        });
        Ok(())
    }

    /// Resume vault operations.
    pub fn emergency_resume(ctx: Context<ManageSigners>) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.paused = false;

        emit!(VaultResumed {
            vault: vault.key(),
        });
        Ok(())
    }
}

// ============================================================
// Constants
// ============================================================

pub const MAX_SIGNERS: usize = 10;
pub const MAX_DESCRIPTION_LEN: usize = 256;

// ============================================================
// Account Structs
// ============================================================

#[account]
pub struct Vault {
    /// DAO authority (can manage signers and risk params)
    pub authority: Pubkey,
    /// AI guardian agent (can create proposals)
    pub guardian: Pubkey,
    /// Total proposals created
    pub proposal_count: u64,
    /// Total proposals executed
    pub executed_count: u64,
    /// Number of approvals needed
    pub approval_threshold: u8,
    /// List of authorized signers
    pub signers: Vec<Pubkey>,
    /// Risk management parameters
    pub risk_params: RiskParams,
    /// Vault creation timestamp
    pub created_at: i64,
    /// Whether vault is paused
    pub paused: bool,
    /// PDA bump
    pub bump: u8,
}

#[account]
pub struct Proposal {
    /// Parent vault
    pub vault: Pubkey,
    /// Proposal index in vault
    pub index: u64,
    /// Who proposed (guardian agent)
    pub proposer: Pubkey,
    /// The strategy to execute
    pub strategy: Strategy,
    /// Human-readable description
    pub description: String,
    /// Current status
    pub status: ProposalStatus,
    /// Signers who approved
    pub approvals: Vec<Pubkey>,
    /// Signers who rejected
    pub rejections: Vec<Pubkey>,
    /// When created
    pub created_at: i64,
    /// When executed (if executed)
    pub executed_at: Option<i64>,
    /// PDA bump
    pub bump: u8,
}

// ============================================================
// Data Types
// ============================================================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct VaultConfig {
    pub approval_threshold: u8,
    pub signers: Vec<Pubkey>,
    pub risk_params: RiskParams,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct RiskParams {
    /// Max percentage in any single non-stable token (basis points, e.g. 3000 = 30%)
    pub max_single_token_bps: u16,
    /// Min percentage in stablecoins (basis points)
    pub min_stablecoin_bps: u16,
    /// Max single swap size in USD (cents)
    pub max_swap_usd_cents: u64,
    /// Max total daily swap volume in USD (cents)
    pub max_daily_volume_usd_cents: u64,
    /// Allowed token mints for the vault
    pub allowed_mints: Vec<Pubkey>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ProposalData {
    pub strategy: Strategy,
    pub description: String,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum Strategy {
    /// Swap token A for token B via Jupiter
    Swap {
        from_mint: Pubkey,
        to_mint: Pubkey,
        amount: u64,
        min_out: u64,
    },
    /// Stake SOL via Marinade
    Stake { amount: u64 },
    /// Unstake mSOL back to SOL
    Unstake { amount: u64 },
    /// Transfer tokens to a specific address
    Transfer {
        mint: Pubkey,
        to: Pubkey,
        amount: u64,
    },
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum ProposalStatus {
    Pending,
    Approved,
    Rejected,
    Executed,
    Cancelled,
}

// ============================================================
// Validation Contexts
// ============================================================

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + 32 + 32 + 8 + 8 + 1 + (4 + 32 * MAX_SIGNERS) + 200 + 8 + 1 + 1 + 128,
        seeds = [b"vault", authority.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, Vault>,
    /// The DAO authority initializing the vault
    #[account(mut)]
    pub authority: Signer<'info>,
    /// The AI guardian agent
    /// CHECK: just storing the pubkey
    pub guardian: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ManageSigners<'info> {
    #[account(
        mut,
        has_one = authority,
    )]
    pub vault: Account<'info, Vault>,
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct CreateProposal<'info> {
    #[account(
        mut,
        has_one = guardian,
        constraint = !vault.paused @ AegisError::VaultPaused,
    )]
    pub vault: Account<'info, Vault>,
    #[account(
        init,
        payer = guardian,
        space = 8 + 32 + 8 + 32 + 200 + MAX_DESCRIPTION_LEN + 1 + (4 + 32 * MAX_SIGNERS) + (4 + 32 * MAX_SIGNERS) + 8 + 9 + 1 + 128,
        seeds = [b"proposal", vault.key().as_ref(), &vault.proposal_count.to_le_bytes()],
        bump
    )]
    pub proposal: Account<'info, Proposal>,
    #[account(mut)]
    pub guardian: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct VoteProposal<'info> {
    #[account(
        constraint = !vault.paused @ AegisError::VaultPaused,
    )]
    pub vault: Account<'info, Vault>,
    #[account(
        mut,
        has_one = vault,
    )]
    pub proposal: Account<'info, Proposal>,
    pub signer: Signer<'info>,
}

#[derive(Accounts)]
pub struct ExecuteSwapProposal<'info> {
    #[account(
        mut,
        constraint = !vault.paused @ AegisError::VaultPaused,
    )]
    pub vault: Account<'info, Vault>,
    #[account(
        mut,
        has_one = vault,
    )]
    pub proposal: Account<'info, Proposal>,
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub destination_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub executor: Signer<'info>,
}

#[derive(Accounts)]
pub struct DepositToVault<'info> {
    pub vault: Account<'info, Vault>,
    #[account(mut)]
    pub depositor: Signer<'info>,
    #[account(mut)]
    pub depositor_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub vault_token_account: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

// ============================================================
// Events
// ============================================================

#[event]
pub struct VaultCreated {
    pub vault: Pubkey,
    pub authority: Pubkey,
    pub guardian: Pubkey,
    pub threshold: u8,
}

#[event]
pub struct SignerAdded {
    pub vault: Pubkey,
    pub signer: Pubkey,
}

#[event]
pub struct SignerRemoved {
    pub vault: Pubkey,
    pub signer: Pubkey,
}

#[event]
pub struct RiskParamsUpdated {
    pub vault: Pubkey,
    pub params: RiskParams,
}

#[event]
pub struct ProposalCreated {
    pub vault: Pubkey,
    pub proposal: Pubkey,
    pub index: u64,
    pub strategy: Strategy,
}

#[event]
pub struct ProposalVoted {
    pub vault: Pubkey,
    pub proposal: Pubkey,
    pub signer: Pubkey,
    pub vote: bool,
}

#[event]
pub struct ProposalApproved {
    pub vault: Pubkey,
    pub proposal: Pubkey,
    pub index: u64,
}

#[event]
pub struct ProposalRejected {
    pub vault: Pubkey,
    pub proposal: Pubkey,
    pub index: u64,
}

#[event]
pub struct ProposalExecuted {
    pub vault: Pubkey,
    pub proposal: Pubkey,
    pub index: u64,
    pub amount: u64,
}

#[event]
pub struct Deposited {
    pub vault: Pubkey,
    pub depositor: Pubkey,
    pub amount: u64,
    pub mint: Pubkey,
}

#[event]
pub struct VaultPaused {
    pub vault: Pubkey,
}

#[event]
pub struct VaultResumed {
    pub vault: Pubkey,
}

// ============================================================
// Errors
// ============================================================

#[error_code]
pub enum AegisError {
    #[msg("Signer already exists in vault")]
    SignerAlreadyExists,
    #[msg("Maximum signers reached")]
    MaxSignersReached,
    #[msg("Signer not found in vault")]
    SignerNotFound,
    #[msg("Threshold exceeds number of signers")]
    ThresholdExceedsSigners,
    #[msg("Proposal is not in pending status")]
    ProposalNotPending,
    #[msg("Not an authorized signer")]
    NotAuthorizedSigner,
    #[msg("Already voted on this proposal")]
    AlreadyVoted,
    #[msg("Proposal is not approved")]
    ProposalNotApproved,
    #[msg("Vault is paused")]
    VaultPaused,
    #[msg("Swap amount exceeds risk parameters")]
    SwapExceedsRiskLimit,
    #[msg("Token mint not in allowed list")]
    MintNotAllowed,
    #[msg("Description too long")]
    DescriptionTooLong,
}
