package cmd

import (
	log "github.com/sirupsen/logrus"
	"github.com/spf13/cobra"
	_ "k8s.io/client-go/plugin/pkg/client/auth/gcp" // GCP auth lib for GKE

	targetBrowser "github.com/trilioData/tvk-plugins/tools/targetbrowser"
)

func init() {
	getCmd.AddCommand(backupCmd())

}

// backupCmd represents the backup command
func backupCmd() *cobra.Command {
	var cmd = &cobra.Command{
		Aliases: []string{backupCmdPluralName},
		Use:     backupCmdName,
		Short: backupShortUsage,
		Long:  backupLongUsage,
		RunE:  runBackup,
	}

	cmd.Flags().IntVarP(&pageSize, pageSizeFlag, pageSizeShort, pageSizeDefault, pageSizeUsage)
	cmd.Flags().IntVarP(&page, pageFlag, pageShort, pageDefault, pageUsage)
	cmd.Flags().StringVarP(&ordering, orderingFlag, orderingShort, orderingDefault, orderingUsage)
	cmd.Flags().StringVarP(&backupPlanUID, backupPlanUIDFlag, backupPlanUIDShort, backupPlanUIDDefault, backupPlanUIDUsage)
	cmd.Flags().StringVarP(&backupStatus, backupStatusFlag, backupStatusShort, backupStatusDefault, backupStatusUsage)
	err := cmd.MarkFlagRequired(backupPlanUIDFlag)
	if err != nil {
		log.Fatalf("Invalid option or missing required flag %s and Error is %s", backupPlanUIDFlag, err.Error())
		return nil
	}
	return cmd
}

func runBackup(*cobra.Command, []string) error {

	bpOptions := targetBrowser.BackupListOptions{
		Page:          page,
		PageSize:      pageSize,
		Ordering:      ordering,
		BackupPlanUID: backupPlanUID,
		BackupStatus:  backupStatus,
	}
	err := targetBrowser.NewClient(APIKey).GetBackups(&bpOptions)
	if err != nil {
		return err
	}
	return nil
}
