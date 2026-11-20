use async_graphql::{Context, Object, Result};

use crate::db::{
    load_app_customization, reset_app_customization, update_app_site_name, update_pdf_conversion,
};
use crate::gql::extra_types::AppCustomizationGql;
use crate::gql::types::require_admin;
use crate::state::AppState;

#[derive(Default)]
pub struct CustomizationMutation;

#[Object]
impl CustomizationMutation {
    async fn update_app_customization(
        &self,
        ctx: &Context<'_>,
        #[graphql(name = "siteName")] site_name: String,
    ) -> Result<AppCustomizationGql> {
        let state = ctx.data_unchecked::<AppState>();
        let _ = require_admin(ctx)?;
        update_app_site_name(&state.pool, &site_name)
            .await
            .map_err(async_graphql::Error::from)?;
        let view = load_app_customization(&state.pool).await?;
        Ok(AppCustomizationGql::from(view))
    }

    async fn update_pdf_conversion_settings(
        &self,
        ctx: &Context<'_>,
        #[graphql(name = "convertPdfToEpub")] convert_pdf_to_epub: bool,
    ) -> Result<AppCustomizationGql> {
        let state = ctx.data_unchecked::<AppState>();
        let _ = require_admin(ctx)?;
        update_pdf_conversion(&state.pool, convert_pdf_to_epub)
            .await
            .map_err(async_graphql::Error::from)?;
        let view = load_app_customization(&state.pool).await?;
        Ok(AppCustomizationGql::from(view))
    }

    async fn reset_app_customization(&self, ctx: &Context<'_>) -> Result<AppCustomizationGql> {
        let state = ctx.data_unchecked::<AppState>();
        let _ = require_admin(ctx)?;
        reset_app_customization(&state.pool)
            .await
            .map_err(async_graphql::Error::from)?;
        let view = load_app_customization(&state.pool).await?;
        Ok(AppCustomizationGql::from(view))
    }
}